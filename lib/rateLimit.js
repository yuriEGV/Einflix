const rateLimitMap = new Map();

/**
 * Simple rate limiter for Next.js API routes.
 * @param {string} key - Unique key for the client (e.g., IP or user ID).
 * @param {number} limit - Max requests allowed in the interval.
 * @param {number} intervalMs - Time window in milliseconds.
 * @returns {boolean} - True if request is allowed, false if rate limited.
 */
export function isRateLimited(key, limit = 50, intervalMs = 60000) {
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, startTime: now };

    if (now - entry.startTime > intervalMs) {
        // Reset window
        entry.count = 1;
        entry.startTime = now;
    } else {
        entry.count++;
    }

    rateLimitMap.set(key, entry);

    return entry.count > limit;
}

// Cleanup interval to avoid memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitMap.entries()) {
            if (now - entry.startTime > 300000) { // Cleanup entries older than 5 mins
                rateLimitMap.delete(key);
            }
        }
    }, 60000);
}
