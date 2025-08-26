import { useEffect, useState, useCallback, type ReactNode } from "react";
import { AuthContext, type AppUser } from "../contexts/authContext";
import {
  auth,
  db,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
} from "../config/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";

const LOCAL_STORAGE_KEY = "xumtech_app_user";

function normalizeFirestoreData(
  firestoreData: Record<string, unknown>
): Partial<AppUser> {
  const { displayName, email, photoURL, role, createdAt } = firestoreData;
  const normalizedCreatedAt =
    createdAt instanceof Timestamp
      ? createdAt.toDate().toISOString()
      : typeof createdAt === "string"
      ? createdAt
      : null;
  return {
    displayName: typeof displayName === "string" ? displayName : undefined,
    email: typeof email === "string" ? email : undefined,
    photoURL: typeof photoURL === "string" ? photoURL : undefined,
    role: role === "admin" ? "admin" : "user",
    createdAt: normalizedCreatedAt,
  };
}

function createCombinedUser(
  authUser: FirebaseUser,
  firestoreData?: Record<string, unknown>
): AppUser {
  const normalizedFirestore = firestoreData
    ? normalizeFirestoreData(firestoreData)
    : {};
  return {
    uid: authUser.uid,
    displayName:
      normalizedFirestore.displayName ?? authUser.displayName ?? null,
    email: normalizedFirestore.email ?? authUser.email ?? null,
    photoURL: normalizedFirestore.photoURL ?? authUser.photoURL ?? null,
    role: normalizedFirestore.role ?? "user",
    createdAt: normalizedFirestore.createdAt ?? new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const updateUserAndPersist = useCallback((userData: AppUser | null) => {
    setUser(userData);
    try {
      if (userData) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userData));
      } else {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to update localStorage:", e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        updateUserAndPersist(null);
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
          const appUser = createCombinedUser(firebaseUser, snapshot.data());
          updateUserAndPersist(appUser);
        } else {
          const newUser = createCombinedUser(firebaseUser);
          const newUserForDb = { ...newUser, createdAt: serverTimestamp() };
          await setDoc(userRef, newUserForDb, { merge: true });
          updateUserAndPersist(newUser);
        }
      } catch (error) {
        console.error("Error syncing user with Firestore:", error);
        const fallbackUser = createCombinedUser(firebaseUser);
        updateUserAndPersist(fallbackUser);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [updateUserAndPersist]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: async () => {
          await signInWithGoogle();
        },
        signOut: signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
