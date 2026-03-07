"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { isDemo, DEMO_USER } from "@/lib/demo";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // ── Demo Mode: skip Firebase auth entirely ──
        if (isDemo) {
            // Cast the demo user object as a User so the rest of the app works
            setUser(DEMO_USER as unknown as User);
            setLoading(false);
            return;
        }
        // ─────────────────────────────────────────────

        // Only import firebase when NOT in demo mode
        const initAuth = async () => {
            const { auth, db } = await import("@/lib/firebase");

            // Helper to ensure user document exists in Firestore
            const ensureUserProfile = async (user: User, name?: string) => {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        id: user.uid,
                        name: name || user.displayName || "User",
                        email: user.email,
                        photoURL: user.photoURL,
                        createdAt: serverTimestamp(),
                    });
                }
            };

            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    await ensureUserProfile(result.user);
                }
            } catch (error: any) {
                console.error("Redirect sign-in error:", error);
                setAuthError(error?.message || "Authentication redirect failed.");
            }

            const unsubscribe = onAuthStateChanged(auth, (user) => {
                setUser(user);
                setLoading(false);
            });
            return unsubscribe;
        };

        let unsubscribe: (() => void) | undefined;
        initAuth().then(unsub => { unsubscribe = unsub; });

        return () => { unsubscribe?.(); };
    }, []);

    const signIn = async (email: string, password: string) => {
        if (isDemo) return;
        setAuthError(null);
        const { auth, db } = await import("@/lib/firebase");
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userRef = doc(db, "users", cred.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                id: cred.user.uid,
                name: cred.user.displayName || "User",
                email: cred.user.email,
                photoURL: cred.user.photoURL,
                createdAt: serverTimestamp(),
            });
        }
    };

    const signUp = async (email: string, password: string, name: string) => {
        if (isDemo) return;
        setAuthError(null);
        const { auth, db } = await import("@/lib/firebase");
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        const userRef = doc(db, "users", cred.user.uid);
        await setDoc(userRef, {
            id: cred.user.uid,
            name: name,
            email: cred.user.email,
            photoURL: cred.user.photoURL,
            createdAt: serverTimestamp(),
        });
    };

    const signInWithGoogle = async () => {
        if (isDemo) return;
        setAuthError(null);
        const { auth, db } = await import("@/lib/firebase");
        const provider = new GoogleAuthProvider();

        try {
            const cred = await signInWithPopup(auth, provider);
            const userRef = doc(db, "users", cred.user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    id: cred.user.uid,
                    name: cred.user.displayName || "User",
                    email: cred.user.email,
                    photoURL: cred.user.photoURL,
                    createdAt: serverTimestamp(),
                });
            }
        } catch (error: any) {
            console.error("Google sign-in auth error detail:", error);
            const msg = error.message || "Google sign-in failed";
            setAuthError(msg);
            throw new Error(msg);
        }
    };

    const signOut = async () => {
        if (isDemo) return;
        const { auth } = await import("@/lib/firebase");
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, authError, signIn, signUp, signInWithGoogle, signOut }}
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
