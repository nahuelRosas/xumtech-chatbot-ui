import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { ChatMessage } from "../api/types/mastra";

type MastraChatContextValue = {
  history: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  setHistory: (h: ChatMessage[]) => void;
  clearHistory: () => void;
  conversationId: string;
  resetConversationId: () => void;
};

const MastraChatContext = createContext<MastraChatContextValue | undefined>(
  undefined
);

const LOCALSTORAGE_PREFIX = "xumtech:mastra:history:";
const LOCALSTORAGE_CONVERSATION_PREFIX = "xumtech:mastra:conversationId:";

function generateUid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sanitizeHistory(arr: unknown): ChatMessage[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((m) => ({
      ...(m as ChatMessage),
      content: (m?.content ?? "")?.toString(),
    }))
    .map((m) => ({ ...m, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
}

export function MastraChatProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.uid ?? null;

  const storageKey = useMemo(() => {
    return userId ? `${LOCALSTORAGE_PREFIX}${userId}` : undefined;
  }, [userId]);

  const [history, setHistoryState] = useState<ChatMessage[]>(() => {
    try {
      if (!userId) return [];
      const raw = localStorage.getItem(`${LOCALSTORAGE_PREFIX}${userId}`);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return sanitizeHistory(parsed);
    } catch (e) {
      console.error("Failed to read mastra history from localStorage", e);
      return [];
    }
  });

  const [conversationId, setConversationId] = useState<string>(() => {
    try {
      const idKey = userId ?? "anon";
      const key = `${LOCALSTORAGE_CONVERSATION_PREFIX}${idKey}`;
      let id = localStorage.getItem(key);
      if (!id) {
        id = generateUid();
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      console.error("Failed to read/set conversationId from localStorage", e);
      return generateUid();
    }
  });

  useEffect(() => {
    try {
      if (!storageKey) return;
      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save mastra history to localStorage", e);
    }
  }, [history, storageKey]);

  useEffect(() => {
    try {
      const idKey = auth?.user?.uid ?? "anon";
      const key = `${LOCALSTORAGE_CONVERSATION_PREFIX}${idKey}`;
      let id = localStorage.getItem(key);
      if (!id) {
        id = generateUid();
        localStorage.setItem(key, id);
      }
      setConversationId(id);
    } catch (e) {
      console.error("Failed to ensure conversationId for user/anon", e);
      setConversationId(generateUid());
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    if (!auth.user) {
      setHistoryState([]);
      return;
    }
    try {
      const raw = localStorage.getItem(
        `${LOCALSTORAGE_PREFIX}${auth.user.uid}`
      );
      setHistoryState(raw ? (JSON.parse(raw) as ChatMessage[]) : []);
    } catch (e) {
      console.error("Failed to load mastra history for new user", e);
      setHistoryState([]);
    }
  }, [auth]);

  const addMessage = useCallback((msg: ChatMessage) => {
    try {
      const content = (msg.content ?? "").toString().trim();
      if (!content) {
        console.warn(
          "MastraChatContext.addMessage: ignored empty message",
          msg
        );
        return;
      }
      const sanitized = { ...msg, content };
      console.debug("MastraChatContext.addMessage: adding message", sanitized);
      setHistoryState((prev) => [...prev, sanitized]);
    } catch (e) {
      console.error("Failed to add message", e);
    }
  }, []);

  const setHistory = useCallback((h: ChatMessage[]) => {
    setHistoryState(sanitizeHistory(h));
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryState([]);
    try {
      if (storageKey) localStorage.removeItem(storageKey);
      if (userId) {
        const cidKey = `${LOCALSTORAGE_CONVERSATION_PREFIX}${userId}`;
        const newId = generateUid();
        localStorage.setItem(cidKey, newId);
        setConversationId(newId);
      }
    } catch (e) {
      console.error("Failed to remove mastra history from localStorage", e);
    }
  }, [storageKey, userId]);

  const resetConversationId = useCallback(() => {
    try {
      if (!userId) return;
      const cidKey = `${LOCALSTORAGE_CONVERSATION_PREFIX}${userId}`;
      const newId = generateUid();
      localStorage.setItem(cidKey, newId);
      setConversationId(newId);
    } catch (e) {
      console.error("Failed to reset conversationId", e);
    }
  }, [userId]);

  const value = useMemo(
    () => ({
      history,
      addMessage,
      setHistory,
      clearHistory,
      conversationId,
      resetConversationId,
    }),
    [
      history,
      addMessage,
      setHistory,
      clearHistory,
      conversationId,
      resetConversationId,
    ]
  );

  return (
    <MastraChatContext.Provider value={value}>
      {children}
    </MastraChatContext.Provider>
  );
}

export default MastraChatContext;
