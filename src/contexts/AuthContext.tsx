import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../services/firebase';
import type { UserProfile, UserProfileUpdate } from '../types/domain';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync user profile with Firestore
        const path = `users/${currentUser.uid}`;
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              email: currentUser.email,
              name: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'CUSTOMER',
              createdAt: serverTimestamp(),
              loyaltyPoints: 0
            };
            try {
              await setDoc(userDocRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, path);
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
              await setDoc(userDocRef, updatedFields, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, path);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfile = async (data: UserProfileUpdate) => {
    if (!user) return;
    try {
      const allowedKeys = ['name', 'firstName', 'lastName', 'phone', 'addresses', 'photoURL'];
      const safeData = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowedKeys.includes(key))
      );
      if (Object.keys(safeData).length === 0) return;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, safeData, { merge: true });
      setProfile((prev) => prev ? { ...prev, ...safeData } : prev);
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  };

  const needsProfileCompletion = !!user && !!profile && !profile.phone;

  return (
    <AuthContext.Provider value={{ user, profile, loading, needsProfileCompletion, loginWithGoogle, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
