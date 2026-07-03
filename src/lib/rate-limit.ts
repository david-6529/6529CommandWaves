type RateLimitOptions = {
  namespace: string;
  max: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function clientIdentity(request: Request) {
  return (
    firstHeaderValue(request.headers.get("cf-connecting-ip")) ||
    firstHeaderValue(request.headers.get("x-real-ip")) ||
    firstHeaderValue(request.headers.get("x-forwarded-for")) ||
    "unknown"
  );
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function assertRateLimit(request: Request, options: RateLimitOptions, now = Date.now()) {
  if (options.max < 1 || options.windowMs < 1) {
    throw new Error("Invalid rate limit configuration.");
  }

  pruneExpiredBuckets(now);

  const key = `${options.namespace}:${clientIdentity(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return;
  }

  if (bucket.count >= options.max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    throw Object.assign(new Error("Too many requests. Try again shortly."), {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  bucket.count += 1;
}

export function resetRateLimitsForTest() {
  buckets.clear();
}
