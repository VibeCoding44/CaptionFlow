/**
 * Simple in-memory rate limiter for Demo mode.
 * Tracks request counts per IP with a 24-hour sliding window.
 *
 * For production-grade rate limiting, swap this out with
 * Upstash Redis + @upstash/ratelimit — but for a portfolio demo
 * this is more than enough.
 */

interface RateLimitEntry {
    count: number;
    firstRequest: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check whether the given IP has exceeded its demo limit.
 *
 * @param ip          - The requester's IP address
 * @param maxRequests - Max requests allowed in the 24-hour window
 * @returns `{ allowed: boolean, remaining: number }`
 */
export function checkDemoRateLimit(
    ip: string,
    maxRequests: number
): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = store.get(ip);

    // First request or window expired → reset
    if (!entry || now - entry.firstRequest > WINDOW_MS) {
        store.set(ip, { count: 1, firstRequest: now });
        return { allowed: true, remaining: maxRequests - 1 };
    }

    // Window still active
    entry.count++;
    store.set(ip, entry);

    const remaining = Math.max(0, maxRequests - entry.count);
    return { allowed: entry.count <= maxRequests, remaining };
}
