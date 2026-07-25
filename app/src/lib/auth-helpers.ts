/**
 * Server-side auth helpers for API routes.
 *
 * - getClientIp: best-effort client IP for demo rate limiting.
 * - verifyRequestAuth: verifies a Firebase ID token from the Authorization header.
 * - userCanBroadcast: authorizes a user against a session's organization,
 *   with a short in-memory cache so the latency-sensitive broadcast path
 *   doesn't hit Firestore on every caption.
 */

/**
 * Best-effort client IP. Prefers the first hop of `x-forwarded-for`
 * (the original client) over the raw header string, falling back to
 * `x-real-ip`. Note: still spoofable without a trusted proxy — demo
 * rate limiting only. For production-grade limits use Upstash Redis.
 */
export function getClientIp(req: Request): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        const first = xff.split(",")[0]?.trim();
        if (first) return first;
    }
    return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Verify a Firebase ID token from the `Authorization: Bearer <token>` header.
 * Returns the decoded uid, or null if missing/invalid.
 */
export async function verifyRequestAuth(req: Request): Promise<{ uid: string } | null> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const token = authHeader.split("Bearer ")[1];
    if (!token) return null;

    try {
        const { adminAuth } = await import("@/lib/firebase-admin");
        const decoded = await adminAuth.verifyIdToken(token);
        return { uid: decoded.uid };
    } catch (error) {
        console.error("ID token verification failed:", error);
        return null;
    }
}

// ── Broadcast authorization cache ───────────────────────────
// Module-level cache persists across invocations within a warm function
// instance. Keyed by `${uid}:${sessionId}`. Bounds Firestore reads to
// roughly once per user/session per TTL window.
interface AuthzEntry {
    ok: boolean;
    expires: number;
}
const authzCache = new Map<string, AuthzEntry>();
const AUTHZ_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Whether `uid` is allowed to broadcast into `sessionId`: true if they
 * created the session or are a member of its organization. Cached for
 * AUTHZ_TTL_MS so the hot broadcast path stays fast.
 */
export async function userCanBroadcast(uid: string, sessionId: string): Promise<boolean> {
    const key = `${uid}:${sessionId}`;
    const now = Date.now();

    const cached = authzCache.get(key);
    if (cached && cached.expires > now) return cached.ok;

    let ok = false;
    try {
        const { adminDb } = await import("@/lib/firebase-admin");
        const sessionSnap = await adminDb.collection("sessions").doc(sessionId).get();

        if (sessionSnap.exists) {
            const session = sessionSnap.data();
            if (session?.createdBy === uid) {
                ok = true;
            } else if (session?.organizationId) {
                const memberSnap = await adminDb
                    .collection("organizationMembers")
                    .where("organizationId", "==", session.organizationId)
                    .where("userId", "==", uid)
                    .limit(1)
                    .get();
                ok = !memberSnap.empty;
            }
        }
    } catch (error) {
        console.error("Broadcast authorization check failed:", error);
        return false; // fail closed; don't cache transient errors
    }

    authzCache.set(key, { ok, expires: now + AUTHZ_TTL_MS });
    return ok;
}
