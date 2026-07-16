import { hashContent, loadCache, saveCache } from "./cache.js";
import { buildClusters } from "./clustering.js";
import { inferDependencies, buildJavaIndex } from "./dependencies.js";
import { discoverSourceFiles, readTargetFile } from "./discovery.js";
import { normalizePath } from "./paths.js";
import { scanJavaStructure } from "./parsers/javaParser.js";
import { scanPythonStructure } from "./parsers/pythonParser.js";
import { scanTSStructure } from "./parsers/tsParser.js";
import type { CacheMap, FileSummary, ScanResult } from "./types.js";

export function inferLanguage(filePath: string): FileSummary["language"] {
  if (filePath.endsWith(".tsx")) {
    return "tsx";
  }
  if (filePath.endsWith(".ts")) {
    return "ts";
  }
  if (filePath.endsWith(".java")) {
    return "java";
  }
  return "py";
}

export function parseSourceFile(filePath: string, content: string): FileSummary["endpoints"] {
  if (filePath.endsWith(".java")) {
    return scanJavaStructure(content);
  }
  if (filePath.endsWith(".py")) {
    return scanPythonStructure(content);
  }
  return scanTSStructure(filePath, content);
}

export function buildScanResult(targetRoot: string, files: FileSummary[]): ScanResult {
  return {
    targetRoot,
    files,
    clusters: buildClusters(files)
  };
}

export async function analyzeRepository(targetRoot: string): Promise<ScanResult> {
  const sourceFiles = await discoverSourceFiles(targetRoot);
  if (sourceFiles.length === 0) {
    return { targetRoot, files: [], clusters: [] };
  }

  const cache = loadCache(targetRoot);
  const knownFiles = new Set(sourceFiles.map(normalizePath));
  const rawFiles = sourceFiles.map((filePath) => ({ filePath, content: readTargetFile(targetRoot, filePath) }));
  const javaIndex = buildJavaIndex(rawFiles.filter((file) => file.filePath.endsWith(".java")));
  const nextCache: CacheMap = {};
  const summaries: FileSummary[] = [];

  for (const file of rawFiles) {
    const hash = hashContent(file.content);
    const language = inferLanguage(file.filePath);
    const cached = cache[file.filePath];

    if (cached && cached.hash === hash) {
      summaries.push({
        filePath: file.filePath,
        hash,
        endpoints: cached.endpoints,
        dependencies: cached.dependencies,
        language: cached.language
      });
      nextCache[file.filePath] = cached;
      continue;
    }

    const endpoints = parseSourceFile(file.filePath, file.content);
    const dependencies = inferDependencies(file.filePath, language, file.content, knownFiles, javaIndex);

    summaries.push({
      filePath: file.filePath,
      hash,
      endpoints,
      dependencies,
      language
    });

    nextCache[file.filePath] = {
      hash,
      endpoints,
      dependencies,
      language
    };
  }

  saveCache(targetRoot, nextCache);
  return buildScanResult(targetRoot, summaries);
}
