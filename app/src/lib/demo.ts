/**
 * Demo Mode Utilities
 *
 * Provides mock data and helpers for the self-contained demo experience.
 * When NEXT_PUBLIC_APP_MODE === "demo", the app runs without Firebase
 * and uses this mock data instead.
 */

import { Organization, Session } from "@/types";

export const isDemo = process.env.NEXT_PUBLIC_APP_MODE === "demo";

// ─── Mock User ────────────────────────────────────────────
export const DEMO_USER = {
    uid: "demo-user-001",
    email: "demo@captionflow.com",
    displayName: "Demo User",
    photoURL: null,
    emailVerified: true,
} as const;

// ─── Mock Organization ────────────────────────────────────
export const DEMO_ORGANIZATION: Organization = {
    id: "demo-org-001",
    name: "Demo Workspace",
    slug: "demo",
    createdAt: Date.now(),
    settings: {
        defaultSourceLanguage: "en",
        defaultTargetLanguages: ["es", "fr"],
    },
    transcriptionSettings: {
        keywords: [],
        profanityFilter: true,
        punctuation: true,
    },
};

// ─── Mock Sessions (pre-filled to make dashboard look alive) ──
export const DEMO_SESSIONS: Session[] = [
    {
        id: "demo-session-001",
        organizationId: DEMO_ORGANIZATION.id,
        name: "Sunday Morning Service",
        status: "completed",
        startTime: Date.now() - 7200000, // 2 hours ago
        endTime: Date.now() - 3600000,   // 1 hour ago
        sourceLanguage: "en",
        targetLanguages: ["es", "fr", "ko"],
        createdAt: Date.now() - 7200000,
        createdBy: DEMO_USER.uid,
    },
    {
        id: "demo-session-002",
        organizationId: DEMO_ORGANIZATION.id,
        name: "Q3 All-Hands Meeting",
        status: "completed",
        startTime: Date.now() - 86400000,
        endTime: Date.now() - 82800000,
        sourceLanguage: "en",
        targetLanguages: ["es", "de"],
        createdAt: Date.now() - 86400000,
        createdBy: DEMO_USER.uid,
    },
    {
        id: "demo-session-003",
        organizationId: DEMO_ORGANIZATION.id,
        name: "Conference Keynote",
        status: "completed",
        startTime: Date.now() - 172800000,
        endTime: Date.now() - 169200000,
        sourceLanguage: "en",
        targetLanguages: ["ja", "zh", "pt"],
        createdAt: Date.now() - 172800000,
        createdBy: DEMO_USER.uid,
    },
];

/**
 * Generate a random session ID for demo mode.
 * No Firestore needed — just a random string.
 */
export function generateDemoSessionId(): string {
    return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
