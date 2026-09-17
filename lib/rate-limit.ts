import "server-only";

/**
 * Minimal in-memory rate limiter, keyed by an arbitrary string (e.g. an IP
 * address or "email:<address>"). Intended as defense-in-depth alongside
 * Supabase Auth's own built-in rate limiting - NOT a replacement for it.
 *
 * LIMITATION: this state lives in the Node.js process memory. On
 * serverless platforms (e.g. Vercel) each function instance has its own
 * memory, so limits are per-instance, not global - a determined attacker
 * distributing requests across instances could exceed the intended cap.
 * For strict guarantees, replace this with a shared store (e.g. Upstash
 * Redis) behind the same `checkRateLimit` signature. Documented in
 * README.md's security section.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

// Periodically clear expired buckets so this Map doesn't grow forever in
// a long-lived process. Harmless no-op on short-lived serverless
// invocations.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000);
