# XumTech UI — Mastra Kitchen

This document explains the entire UI application (Mastra Kitchen) architecture and workflow in detail. It focuses only on the UI layer located in `xumtech-chatbot-ui/src`. The goal is to describe components, contexts, data flow, authentication, API integration, local persistence, and the chat conversation circuit.

## Table of contents

- Overview
- Project structure (relevant files)
- High-level architecture and responsibilities
- Initialization & bootstrapping flow
- Authentication flow (Firebase)
- Mastra chat circuit (end-to-end)
  - Message lifecycle
  - Conversation and history persistence
  - API interactions and error handling
  - UI rendering states
- Quests (prompt suggestions) flow
- Admin panel (brief)
- Network & Axios configuration
- Environment variables
- Edge cases and failure modes
- How to run (dev / build / env)
- Appendix: key code references

## Overview

Mastra Kitchen is a single-page React application built with Vite and TypeScript. It provides a chat UI that allows authenticated users to ask the Mastra assistant (backend AI) questions about recipes and culinary tips. It uses Firebase for authentication, Firestore for user metadata, and a backend API for chat responses and quests via Axios wrapped with React Query.

This documentation describes the UI-only workflow and circuit, covering how the app boots, how users sign-in/out, how chat messages move from UI -> backend -> response, and how conversation state is persisted locally per-user.

## Project structure (relevant files)

- `src/main.tsx` — app bootstrap, React Query client, providers (`AuthProvider`, `MastraChatProvider`).
- `src/App.tsx` — top-level layout and decides whether to show `Chat` based on auth state.
- `src/providers/AuthProvider.tsx` — integrates Firebase auth + Firestore user sync, exposes `AuthContext`.
- `src/contexts/authContext.tsx` — auth context types and `useAuth` helper.
- `src/contexts/MastraChatContext.tsx` — chat state management, localStorage persistence, conversation id handling.
- `src/hooks/useAuth.ts` — convenience hook for `AuthContext`.
- `src/hooks/useMastraChat.ts` — convenience hook for `MastraChatContext`.
- `src/components/chat/Chat.tsx` — main chat UI, input, messages list, floating prompts, and admin tab.
- `src/components/admin/AdminPanel.tsx` — admin UI (edit/create quests) — referenced by `Chat`.
- `src/api/useMastraChat.ts` — React Query wrapper for `/mastra/chat` backend call.
- `src/api/useQuests.ts` — React Query wrappers for quests endpoints (`/quests`).
- `src/config/firebase.ts` — Firebase initialization, App Check, sign-in/out helpers.
- `src/config/core/axios/services/axios.service.ts` — axios instance with interceptors (App Check header, Authorization token), error mapping.
- `src/config/core/axios/services/api.service.ts` — small wrapper over http service returning data payloads.
- `src/api/types/mastra.ts` — chat DTO and types.

## High-level architecture and responsibilities

- UI is composed of a provider layer and presentational/logic components.
- `AuthProvider` manages authentication and synchronizes user metadata with Firestore. It stores a simplified `AppUser` in localStorage for quick retrieval and exposes `signIn` and `signOut` functions.
- `MastraChatProvider` keeps an in-memory `history` (array of ChatMessage) and `conversationId` per user. It persists history and conversationId in `localStorage` under keys prefixed with `xumtech:mastra:history:` and `xumtech:mastra:conversationId:`. It exposes operations: `addMessage`, `setHistory`, `clearHistory`, and `resetConversationId`.
- API calls go through `axiosService` which attaches Firebase App Check token and the user's ID token to requests. The service returns typed data payloads; React Query is used for caching, retries, and background behavior.
- `Chat` component drives the UI: sending user messages, adding them to local history immediately, calling the backend, and appending the backend's reply to history.

## Initialization & bootstrapping flow

1. `main.tsx` creates a `QueryClient` and renders the app wrapped by `AuthProvider`, `QueryClientProvider`, and `MastraChatProvider` (order: Auth -> Query -> Mastra). This order ensures `MastraChatProvider` can access the authenticated user when it initializes.
2. `AuthProvider` subscribes to Firebase `onAuthStateChanged`. On sign-in, it fetches or creates a Firestore `users/{uid}` document, merges any server data, and persists a normalized `AppUser` in `localStorage` under `xumtech_app_user`.
3. `MastraChatProvider` reads existing history and conversationId from `localStorage` keyed by the user's uid (or "anon" when not signed). It sets up internal state and effects to persist history on changes and to create/reset conversationId when needed.

## Authentication flow (Firebase)

Contract:

- Inputs: user triggers sign-in using Google popup.
- Outputs: `AuthContext` contains `user: AppUser | null`, `loading: boolean`, `signIn()`, `signOut()`.
- Error modes: Firebase popup errors, Firestore read/write errors. `AuthProvider` uses try/catch and falls back to a generated `AppUser` if Firestore sync fails.

Detailed steps:

- User clicks "Sign In" in `App.tsx` which calls `signIn()` from `AuthContext` implemented by `AuthProvider` and backed by `signInWithGoogle()` in `src/config/firebase.ts`.
- `onAuthStateChanged` fires with a Firebase `User`. `AuthProvider` attempts to read Firestore `users/{uid}`. If not present, it writes a new document with `createdAt: serverTimestamp()`.
- `AuthProvider` normalizes Firestore data, combines it with the Firebase user details, and sets it in state and `localStorage` so UI components can read user info quickly.
- Sign-out calls `signOutUser()` which signs out Firebase auth and `AuthProvider` sees a null user and clears local state and `localStorage`.

Notes:

- `AuthProvider` stores a simplified `AppUser` shape which includes `role: "user" | "admin"`. Some UI elements (like admin tab) depend on this `role`.

## Mastra chat circuit (end-to-end)

Overview: when a user sends a message, the UI appends it to the local `history`, then triggers a backend call to `/mastra/chat` with the message and `conversationId`. On backend response, the UI appends Mastra's reply to `history`. History is persisted locally for the user and can be cleared/reset by the user.

Contract:

- Inputs: `message: string`, `conversationId: string`.
- API: POST `/mastra/chat` expects `{ message, conversationId }` and returns `{ payload: { answer: string } }` (per IApiResponse<CreateChatResponse> wrappers used in the frontend).
- Outputs: updated `history` containing new user message and system message; `conversationId` persists across page loads until reset.
- Errors: network errors, API errors (mapped to `ApiResponseError`), App Check missing, Firebase ID token missing.

Message lifecycle (detailed):

1. User types a message in `ChatPanel` input and presses Enter or clicks send.
2. `ChatPanel.handleSend()` trims the input and early exits if empty or already sending.
3. It calls `addMessage({ role: 'user', content: text })` from `MastraChatContext`. This updates local `history` state immediately, causing UI to render the new user message (optimistic update).
4. `ChatPanel` sets `pendingMessage` to that text. `useMastraChat(pendingMessage, conversationId, { enabled: !!pendingMessage })` triggers a React Query request with the query key `['mastra','chat',conversationId,message]`.
5. Request pipeline:
   - `axios.service` request interceptor acquires App Check token and Firebase ID token and sets headers `X-Firebase-AppCheck` and `Authorization: Bearer <idToken>`.
   - Backend receives message and conversationId and processes it. The backend is responsible for conversation continuity using conversationId.
6. On success (`data.payload.answer`), an effect in `ChatPanel` calls `addMessage({ role: 'system', content: data.payload.answer })`, appending the assistant's reply to `history`.
7. On failure, the effect appends a generic error system message.
8. After `data` or `error`, `pendingMessage` is cleared to allow new requests.

Conversation and history persistence:

- `MastraChatProvider` persists the `history` to localStorage whenever it changes using a user-specific key `xumtech:mastra:history:{uid}`.
- `conversationId` is persisted under `xumtech:mastra:conversationId:{uid}`. When a user clears history, a new `conversationId` is generated and stored, effectively creating a fresh conversation context for the backend.

API interactions and error handling:

- React Query controls retry behavior and caching. Query client options in `main.tsx` disable refetches on focus/reconnect and apply a retry strategy that avoids retrying 4xx errors and limits retries to 3 attempts for transient failures.
- `axios.service` maps backend error responses to an `ApiResponseError` class; the frontend code (e.g., `useMastraChat`) surfaces Errors to React Query which exposes them in `error`.
- `ChatPanel` handles `error` by adding a system message: "Sorry, something went wrong. Please try again."

UI rendering states:

- Initial: when no messages, the Chat shows a welcome screen and floating quests prompts if available.
- Sending: `isLoading` toggles display of `ChatLoader` component which shows pulses.
- History present: chat messages are rendered using `ChatMessage` component. User messages align to the right; Mastra messages align to the left with specific styling.

## Quests (prompt suggestions) flow

- `ChatPanel` uses `useGetQuests()` to fetch quests from `/quests`. On first render, queries are cached per React Query default.
- If `history` is empty and quests are available, `FloatingPrompts` shows up to 3 sample prompts (randomly selected from the quests payload). Each prompt, when clicked, behaves like a user message: it calls `addMessage` and sets `pendingMessage` to trigger the chat API.
- Admin users can manage quests through `AdminPanel` (not detailed here) which calls create/edit/delete endpoints from `useQuests.ts`.

## Admin panel (brief)

- `Chat` shows an "Admin" tab when `user.role === 'admin'`. The actual panel implementation lives in `src/components/admin/AdminPanel.tsx` and uses the `useCreateQuests`, `useEditQuest`, and `useDeleteQuest` hooks to manage quests.

## Network & Axios configuration

- `axios.service`'s `baseURL` uses `VITE_BACKEND_URL` in production and `VITE_BACKEND_URL || http://localhost:8080/api` in development.
- Request interceptor adds headers:
  - `X-Firebase-AppCheck: <token>` (using `getToken(appCheckInstance)`)
  - `Authorization: Bearer <idToken>` (using `auth.currentUser?.getIdToken()`)
- Response interceptor maps axios errors to a domain `ApiResponseError`, preserving `statusCode`, `message`, `details`, etc.

## Environment variables (used by UI)

- VITE_FIRE_API_KEY
- VITE_FIRE_AUTH_DOMAIN
- VITE_FIRE_PROJECT_ID
- VITE_FIRE_STORAGE_BUCKET
- VITE_FIRE_MESSAGING_SENDER_ID
- VITE_FIRE_APP_ID
- VITE_APPCHECK_DEBUG_TOKEN (optional, DEV only)
- VITE_RECAPTCHA_SITE_KEY (required for AppCheck)
- VITE_BACKEND_URL (backend API base URL)

## Edge cases and failure modes

1. No App Check token available — `axios.service` will reject requests. The app logs the error and the request fails. UI will show the generic error message. Ensure `VITE_RECAPTCHA_SITE_KEY` is set.
2. Missing Firebase ID token — requests will be sent without `Authorization` header. Backend should handle unauthenticated requests if allowed or return 401.
3. LocalStorage write/read failures — `MastraChatProvider` and `AuthProvider` catch and log errors. If localStorage is unavailable, history won't persist across reloads.
4. Race conditions when switching users — `MastraChatProvider` listens to `auth` changes and reloads history for new users; but quick user swaps could cause old writes to overwrite new ones. The provider sets storage reading on `auth` change to reduce this risk.
5. Large history — the UI stores full text in localStorage; very large histories may exceed storage quotas. Consider trimming history (not implemented).
6. Network timeouts — React Query handles retries with exponential backoff; expensive queries are limited by `retry` and `retryDelay` settings.

## How to run (dev / build)

Assuming you are in the monorepo root and have pnpm installed.

Development (UI):

1. cd `xumtech-chatbot-ui`
2. Install dependencies (if not already):

```bash
pnpm install
```

3. Create a `.env` or set environment variables for Vite. Minimal for local dev:

```bash
VITE_BACKEND_URL=http://localhost:8080/api
VITE_FIRE_API_KEY=...
VITE_FIRE_AUTH_DOMAIN=...
VITE_FIRE_PROJECT_ID=...
VITE_FIRE_STORAGE_BUCKET=...
VITE_FIRE_MESSAGING_SENDER_ID=...
VITE_FIRE_APP_ID=...
VITE_RECAPTCHA_SITE_KEY=...
```

4. Start dev server:

```bash
pnpm run dev
```

Build:

```bash
pnpm run build
```

Serve preview:

```bash
pnpm run preview
```

## Appendix: key code references

- Bootstrapping (providers): `src/main.tsx`
- Top-level UI: `src/App.tsx`
- Auth provider: `src/providers/AuthProvider.tsx`
- Chat state provider: `src/contexts/MastraChatContext.tsx`
- Chat UI and message flow: `src/components/chat/Chat.tsx`
- Network layer: `src/config/core/axios/services/axios.service.ts` and `src/config/core/axios/services/api.service.ts`
- Firebase setup: `src/config/firebase.ts`

## Completion & next steps

- This file documents the full UI workflow and circuit in detail. If you'd like, I can:
  - Add sequence diagrams (textual or mermaid) showing message lifecycle.
  - Produce a smaller quickstart README specifically for developers onboarding.
  - Add automated tests for `MastraChatContext` behavior (sanitize, localStorage, addMessage).
