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
import { auth, db } from "@/lib/firebase";

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

    // Helper to ensure user document exists in Firestore
    const ensureUserProfile = async (user: User, name?: string) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // Create User document
            await setDoc(userRef, {
                id: user.uid,
                name: name || user.displayName || "User",
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
            });
        }

        // We removed the auto creation of default workspaces here.
        // Users will now be prompted to create or join an organization upon logging in.
    };

    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const result = await getRedirectResult(auth);
                if (result?.user) {
                    await ensureUserProfile(result.user);
                }
            } catch (error: any) {
                console.error("Redirect sign-in error:", error);
                setAuthError(error?.message || "Authentication redirect failed.");
            }
        };
        checkRedirect();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        setAuthError(null);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await ensureUserProfile(cred.user);
    };


    const signUp = async (email: string, password: string, name: string) => {
        setAuthError(null);
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await ensureUserProfile(cred.user, name);
    };

    const signInWithGoogle = async () => {
        setAuthError(null);
        const provider = new GoogleAuthProvider();

        try {
            const cred = await signInWithPopup(auth, provider);
            await ensureUserProfile(cred.user);
        } catch (error: any) {
            console.error("Google sign-in auth error detail:", error);
            const msg = error.message || "Google sign-in failed";
            setAuthError(msg);
            throw new Error(msg);
        }
    };

    const signOut = async () => {
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
