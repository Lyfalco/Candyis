import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../firebase/auth';
import {
  deleteUserData,
  updateDisplayName as syncDisplayName,
  updatePhotoURL as syncPhotoURL,
} from '../leaderboard/leaderboardService';
import { AuthProviderId, AuthUser } from './types';

/** Real Firebase Authentication — Email/Password and Anonymous (guest). */
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  /** True once Firebase has reported the persisted sign-in state at least once (fires quickly, but is real network/disk I/O — the intro screen waits on it). */
  isAuthResolved: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePhotoURL: (photoURL: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseUser(firebaseUser: FirebaseUser | null): AuthUser | null {
  if (!firebaseUser) return null;

  const provider: AuthProviderId = firebaseUser.isAnonymous ? 'guest' : 'email';

  return {
    id: firebaseUser.uid,
    displayName: firebaseUser.displayName ?? (provider === 'guest' ? 'Guest' : (firebaseUser.email ?? 'Player')),
    photoURL: firebaseUser.photoURL,
    provider,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthResolved, setIsAuthResolved] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, (firebaseUser) => {
        setUser(mapFirebaseUser(firebaseUser));
        setIsAuthResolved(true);
      }),
    [],
  );

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      setUser(mapFirebaseUser(credential.user));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  // Deletes the Firestore leaderboard doc first (while still authenticated so
  // the security rules' `request.auth.uid == userId` check still passes),
  // then removes the Firebase Auth account itself.
  const deleteAccount = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await deleteUserData(currentUser.uid);
      await deleteUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Updates both the Firebase Auth profile (source of truth for this
  // session) and the Firestore leaderboard doc (source of truth for every
  // other player's view of this name) together, so the change is immediate
  // everywhere instead of waiting for the next score submission to
  // incidentally overwrite the stale Firestore copy.
  const updateDisplayName = useCallback(async (displayName: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const trimmed = displayName.trim();
    setIsLoading(true);
    try {
      await updateProfile(currentUser, { displayName: trimmed });
      await syncDisplayName(currentUser.uid, trimmed);
      setUser(mapFirebaseUser(currentUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Updates both the Firebase Auth profile and the Firestore leaderboard doc
  // together, same rationale as `updateDisplayName` — immediate everywhere
  // instead of waiting for the next score submission.
  const updatePhotoURL = useCallback(async (photoURL: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await updateProfile(currentUser, { photoURL });
      await syncPhotoURL(currentUser.uid, photoURL);
      setUser(mapFirebaseUser(currentUser));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthResolved,
      signUpWithEmail,
      signInWithEmail,
      continueAsGuest,
      signOut,
      deleteAccount,
      updateDisplayName,
      updatePhotoURL,
    }),
    [
      user,
      isLoading,
      isAuthResolved,
      signUpWithEmail,
      signInWithEmail,
      continueAsGuest,
      signOut,
      deleteAccount,
      updateDisplayName,
      updatePhotoURL,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
