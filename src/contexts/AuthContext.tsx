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

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
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
            const isAdmin = currentUser.email === 'littlefigther50@gmail.com';
            const newProfile = {
              email: currentUser.email,
              name: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: isAdmin ? 'ADMIN' : 'CUSTOMER',
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
            const data = userDoc.data();
            const isAdmin = currentUser.email === 'littlefigther50@gmail.com';
            
            // Sincronização Inteligente no Login (Profile Sync)
            let needsUpdate = false;
            const updatedFields: any = {};
            
            if (isAdmin && data.role !== 'ADMIN') {
              updatedFields.role = 'ADMIN';
              needsUpdate = true;
            }
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

  const updateProfile = async (data: Partial<any>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, data, { merge: true });
      setProfile((prev: any) => prev ? { ...prev, ...data } : { ...data });
    } catch (err) {
      console.error("Failed to update profile:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout, updateProfile }}>
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
