const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export function rateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = requests.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    requests.set(ip, recent);
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  requests.set(ip, recent);

  // Clean up old entries periodically
  if (requests.size > 10_000) {
    for (const [key, vals] of requests) {
      if (vals.every((t) => now - t > WINDOW_MS)) {
        requests.delete(key);
      }
    }
  }

  return { allowed: true, remaining: MAX_REQUESTS - recent.length };
}
