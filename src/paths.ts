import path from "node:path";

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function resolveTargetRoot(target?: string): string {
  return path.resolve(target ?? process.cwd());
}

export function toRelativePath(root: string, absolutePath: string): string {
  return normalizePath(path.relative(root, absolutePath));
}

export function ensurePosixJoin(...segments: string[]): string {
  return normalizePath(path.posix.join(...segments.map(normalizePath)));
}

export function sanitizeName(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}