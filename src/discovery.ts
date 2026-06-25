import fs from "node:fs";
import path from "node:path";
import { glob } from "glob";
import { normalizePath } from "./paths.js";

const SUPPORTED_EXTENSIONS = new Set([".ts", ".tsx", ".java", ".py"]);

export async function discoverSourceFiles(targetRoot: string): Promise<string[]> {
  const matches = await glob("**/*.{ts,tsx,java,py}", {
    cwd: targetRoot,
    nodir: true,
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/target/**",
      "**/.git/**",
      "**/.venv/**",
      "**/venv/**",
      "**/__pycache__/**",
      "**/.agent-harness/**"
    ]
  });

  return matches
    .filter((entry) => SUPPORTED_EXTENSIONS.has(path.extname(entry)))
    .map(normalizePath)
    .sort((left, right) => left.localeCompare(right));
}

export function readTargetFile(targetRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(targetRoot, relativePath), "utf8");
}