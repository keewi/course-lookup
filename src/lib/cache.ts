import fs from "fs";
import path from "path";

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

const memoryCache = new Map<string, CacheEntry>();

function getCacheDir(): string | null {
  // In production (Vercel), use /tmp. Locally, use .cache in the project.
  if (process.env.VERCEL) {
    return "/tmp/course-lookup-cache";
  }
  const dir = path.join(process.cwd(), ".cache");
  return dir;
}

function ensureCacheDir(): string | null {
  const dir = getCacheDir();
  if (!dir) return null;
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    return null;
  }
}

function cacheKeyToFilename(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
}

export function getCached(key: string): unknown | null {
  const now = Date.now();

  // Check memory cache first
  const memEntry = memoryCache.get(key);
  if (memEntry && now - memEntry.cachedAt < CACHE_TTL_MS) {
    return memEntry.data;
  }

  // Check file cache
  const dir = ensureCacheDir();
  if (dir) {
    try {
      const filePath = path.join(dir, cacheKeyToFilename(key));
      if (fs.existsSync(filePath)) {
        const entry: CacheEntry = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (now - entry.cachedAt < CACHE_TTL_MS) {
          memoryCache.set(key, entry);
          return entry.data;
        }
        // Expired — delete stale file
        fs.unlinkSync(filePath);
      }
    } catch {
      // File read failed, fall through
    }
  }

  return null;
}

export function setCache(key: string, data: unknown): void {
  const entry: CacheEntry = { data, cachedAt: Date.now() };

  // Always set memory cache
  memoryCache.set(key, entry);

  // Try to persist to file
  const dir = ensureCacheDir();
  if (dir) {
    try {
      const filePath = path.join(dir, cacheKeyToFilename(key));
      fs.writeFileSync(filePath, JSON.stringify(entry));
    } catch {
      // File write failed, memory cache still works
    }
  }
}
