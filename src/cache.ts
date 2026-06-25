import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CacheMap } from "./types.js";

const CACHE_DIR = ".agent-harness";
const CACHE_FILE = "cache.json";

export function getCachePath(targetRoot: string): string {
  return path.join(targetRoot, CACHE_DIR, CACHE_FILE);
}

export function loadCache(targetRoot: string): CacheMap {
  const cachePath = getCachePath(targetRoot);
  if (!fs.existsSync(cachePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")) as CacheMap;
  } catch {
    return {};
  }
}

export function saveCache(targetRoot: string, cache: CacheMap): void {
  const cachePath = getCachePath(targetRoot);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}