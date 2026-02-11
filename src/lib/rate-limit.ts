const rateLimiterMap = new Map<string, number[]>();

// Cleanup stale entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimiterMap) {
      const filtered = timestamps.filter((t) => t > now - 15 * 60 * 1000);
      if (filtered.length === 0) {
        rateLimiterMap.delete(key);
      } else {
        rateLimiterMap.set(key, filtered);
      }
    }
  }, 60_000);
}

export function rateLimit(opts: { interval: number; limit: number }) {
  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now();
      const windowStart = now - opts.interval;
      const timestamps = (rateLimiterMap.get(key) ?? []).filter(
        (t) => t > windowStart
      );

      if (timestamps.length >= opts.limit) {
        return { success: false, remaining: 0 };
      }

      timestamps.push(now);
      rateLimiterMap.set(key, timestamps);
      return { success: true, remaining: opts.limit - timestamps.length };
    },
  };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}
