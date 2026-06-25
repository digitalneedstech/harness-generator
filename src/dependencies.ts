import path from "node:path";
import { normalizePath } from "./paths.js";
import type { FileSummary } from "./types.js";

function resolveRelativeImport(fromFile: string, importPath: string): string[] {
  const baseDir = path.posix.dirname(normalizePath(fromFile));
  const resolved = normalizePath(path.posix.normalize(path.posix.join(baseDir, importPath)));
  const candidates = [resolved];

  if (!path.posix.extname(resolved)) {
    candidates.push(`${resolved}.ts`, `${resolved}.tsx`, `${resolved}.py`, `${resolved}.java`);
    candidates.push(`${resolved}/index.ts`, `${resolved}/index.tsx`, `${resolved}/__init__.py`);
  }

  return candidates;
}

function extractTsDependencies(filePath: string, content: string, knownFiles: Set<string>): string[] {
  const dependencies = new Set<string>();
  const regexes = [
    /from\s+["']([^"']+)["']/g,
    /require\(\s*["']([^"']+)["']\s*\)/g
  ];

  for (const regex of regexes) {
    for (const match of content.matchAll(regex)) {
      const specifier = match[1];
      if (!specifier.startsWith(".")) {
        continue;
      }

      for (const candidate of resolveRelativeImport(filePath, specifier)) {
        if (knownFiles.has(candidate)) {
          dependencies.add(candidate);
        }
      }
    }
  }

  return Array.from(dependencies).sort((left, right) => left.localeCompare(right));
}

function extractPythonDependencies(filePath: string, content: string, knownFiles: Set<string>): string[] {
  const dependencies = new Set<string>();

  for (const match of content.matchAll(/from\s+(\.[\w.]+)\s+import\s+/g)) {
    const modulePath = match[1];
    const candidate = modulePath.replace(/\./g, "/");
    for (const resolved of resolveRelativeImport(filePath, candidate)) {
      if (knownFiles.has(resolved)) {
        dependencies.add(resolved);
      }
    }
  }

  return Array.from(dependencies).sort((left, right) => left.localeCompare(right));
}

function extractJavaDependencies(content: string, javaIndex: Map<string, string>): string[] {
  const dependencies = new Set<string>();

  for (const match of content.matchAll(/^import\s+([\w.]+);/gm)) {
    const importedClass = match[1];
    const filePath = javaIndex.get(importedClass);
    if (filePath) {
      dependencies.add(filePath);
    }
  }

  return Array.from(dependencies).sort((left, right) => left.localeCompare(right));
}

export function buildJavaIndex(files: Array<{ filePath: string; content: string }>): Map<string, string> {
  const index = new Map<string, string>();
  for (const file of files) {
    const packageName = file.content.match(/^package\s+([\w.]+);/m)?.[1];
    const className = file.content.match(/\bclass\s+(\w+)/)?.[1];
    if (!packageName || !className) {
      continue;
    }

    index.set(`${packageName}.${className}`, file.filePath);
  }

  return index;
}

export function inferDependencies(
  filePath: string,
  language: FileSummary["language"],
  content: string,
  knownFiles: Set<string>,
  javaIndex: Map<string, string>
): string[] {
  switch (language) {
    case "ts":
    case "tsx":
      return extractTsDependencies(filePath, content, knownFiles);
    case "py":
      return extractPythonDependencies(filePath, content, knownFiles);
    case "java":
      return extractJavaDependencies(content, javaIndex);
    default:
      return [];
  }
}