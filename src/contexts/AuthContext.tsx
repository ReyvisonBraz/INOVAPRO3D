/* eslint-disable react-refresh/only-export-components -- Provider + hook no mesmo módulo é o padrão idiomático deste projeto (não afeta runtime, só Fast Refresh). */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { UserProfile, UserProfileUpdate } from "../types/domain";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsProfileCompletion: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: UserProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  eager = false,
}: {
  children: React.ReactNode;
  eager?: boolean;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(eager);
  const authStartRef = useRef<Promise<void> | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startAuth = useCallback(() => {
    if (authStartRef.current) return authStartRef.current;
    setLoading(true);
    authStartRef.current = Promise.all([
      import("firebase/auth"),
      import("firebase/firestore"),
      import("../services/firebase"),
    ])
      .then(([authApi, firestoreApi, firebase]) => {
        unsubscribeRef.current = authApi.onAuthStateChanged(firebase.auth, async (currentUser) => {
          setUser(currentUser);

          if (currentUser) {
            try {
              const userDocRef = firestoreApi.doc(firebase.db, "users", currentUser.uid);
              const userDoc = await firestoreApi.getDoc(userDocRef);

              if (!userDoc.exists()) {
                const nameParts = currentUser.displayName?.trim().split(/\s+/) ?? [];
                const newProfile: UserProfile = {
                  email: currentUser.email,
                  name: currentUser.displayName,
                  firstName: nameParts[0] ?? undefined,
                  lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
                  photoURL: currentUser.photoURL,
                  role: "CUSTOMER",
                  createdAt: firestoreApi.serverTimestamp(),
                  loyaltyPoints: 0,
                };
                try {
                  await firestoreApi.setDoc(userDocRef, newProfile);
                  setProfile(newProfile);
                } catch {
                  setProfile(null);
                }
              } else {
                const data = userDoc.data() as UserProfile;

                // Sincronização Inteligente no Login (Profile Sync)
                let needsUpdate = false;
                const updatedFields: UserProfileUpdate = {};

                if (currentUser.displayName && data.name !== currentUser.displayName) {
                  updatedFields.name = currentUser.displayName;
                  needsUpdate = true;
                }
                if (currentUser.photoURL && data.photoURL !== currentUser.photoURL) {
                  updatedFields.photoURL = currentUser.photoURL;
                  needsUpdate = true;
                }

                if (needsUpdate) {
                  const updatedProfile = { ...data, ...updatedFields };
                  await firestoreApi.setDoc(userDocRef, updatedFields, { merge: true });
                  setProfile(updatedProfile);
                } else {
                  setProfile(data);
                }
              }
            } catch {
              // A navegação continua disponível mesmo se o perfil estiver offline.
              setProfile(null);
            }
          } else {
            setProfile(null);
          }

          setLoading(false);
        });
      })
      .catch(() => setLoading(false));
    return authStartRef.current;
  }, []);

  useEffect(() => {
    if (eager) void startAuth();
    return () => unsubscribeRef.current?.();
  }, [eager, startAuth]);

  const loginWithGoogle = async () => {
    try {
      await startAuth();
      const [{ GoogleAuthProvider, signInWithPopup }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("../services/firebase"),
      ]);
      await auth.authStateReady();
      if (!auth.currentUser) await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await startAuth();
      const [{ signOut }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("../services/firebase"),
      ]);
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (data: UserProfileUpdate) => {
    if (!user) return;
    try {
      const [{ doc, setDoc }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("../services/firebase"),
      ]);
      const allowedKeys = ["name", "firstName", "lastName", "phone", "addresses", "photoURL"];
      const safeData = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedKeys.includes(key)),
      );
      if (Object.keys(safeData).length === 0) return;

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, safeData, { merge: true });
      setProfile((prev) => (prev ? { ...prev, ...safeData } : prev));
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  };

  const needsProfileCompletion = !!user && !!profile && !profile.phone;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsProfileCompletion,
        loginWithGoogle,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
