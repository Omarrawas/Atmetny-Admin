'use client';

import type React from 'react';
import { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebaseClient';
import type { User as AppUser } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const appUserData = { id: userDoc.id, ...userDoc.data() } as AppUser;
            setUser(appUserData);
            setIsAdmin(appUserData.role === 'admin');
          } else {
            // Handle case where user exists in Auth but not Firestore, e.g. new admin setup
            // For this app, we assume admin users are pre-provisioned in Firestore.
            setUser(null); 
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 p-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}
