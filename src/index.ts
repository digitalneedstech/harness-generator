#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { hashContent, loadCache, saveCache } from "./cache.js";
import { buildClusters } from "./clustering.js";
import { inferDependencies, buildJavaIndex } from "./dependencies.js";
import { discoverSourceFiles, readTargetFile } from "./discovery.js";
import { createGenerationClient, MockGenerationClient } from "./llm/client.js";
import { buildArtifactRequests } from "./llm/prompts.js";
import { normalizePath, resolveTargetRoot } from "./paths.js";
import { scanJavaStructure } from "./parsers/javaParser.js";
import { scanPythonStructure } from "./parsers/pythonParser.js";
import { scanTSStructure } from "./parsers/tsParser.js";
import type { ArtifactFamily, CacheMap, CliOptions, FileSummary, ScanResult, TargetTool } from "./types.js";
import { materializeArtifacts } from "./writers.js";

const DEFAULT_OUTPUTS: ArtifactFamily[] = ["instructions", "rules", "skills", "hooks", "agents"];
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

function parseOutputs(value?: string): ArtifactFamily[] {
  if (!value) {
    return [];
  }

  const aliases = new Map<string, ArtifactFamily>([
    ["claude", "instructions"],
    ["instructions", "instructions"],
    ["rules", "rules"],
    ["skills", "skills"],
    ["hooks", "hooks"],
    ["agents", "agents"]
  ]);

  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const mapped = aliases.get(entry);
      if (mapped) {
        return mapped;
      }

      throw new Error(`Unsupported output target: ${entry}`);
    });
}

function parseTargets(value?: string): TargetTool[] {
  if (!value) {
    return ["standard"];
  }

  const supportedTargets = new Set<TargetTool>(["standard", "claude", "cursor", "copilot", "codex"]);

  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (supportedTargets.has(entry as TargetTool)) {
        return entry as TargetTool;
      }

      throw new Error(`Unsupported tool target: ${entry}. Supported targets: standard, claude, cursor, copilot, codex`);
    });
}

function inferLanguage(filePath: string): FileSummary["language"] {
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

function parseSourceFile(filePath: string, content: string): FileSummary["endpoints"] {
  if (filePath.endsWith(".java")) {
    return scanJavaStructure(content);
  }
  if (filePath.endsWith(".py")) {
    return scanPythonStructure(content);
  }
  return scanTSStructure(filePath, content);
}

async function promptForOutputs(): Promise<ArtifactFamily[]> {
  const response = await p.multiselect({
    message: "Select output artifacts to generate:",
    options: DEFAULT_OUTPUTS.map((value) => ({
      value,
      label: value === "instructions" ? "instructions (alias: claude)" : value
    }))
  });

  if (p.isCancel(response)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  return response as ArtifactFamily[];
}

function buildScanResult(targetRoot: string, files: FileSummary[]): ScanResult {
  return {
    targetRoot,
    files,
    clusters: buildClusters(files)
  };
}

async function analyzeRepository(targetRoot: string): Promise<ScanResult> {
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

function printScanSummary(scanResult: ScanResult): void {
  const endpointCount = scanResult.files.reduce((count, file) => count + file.endpoints.length, 0);
  const frameworkCount = new Map<string, number>();
  for (const endpoint of scanResult.files.flatMap((file) => file.endpoints)) {
    frameworkCount.set(endpoint.framework, (frameworkCount.get(endpoint.framework) ?? 0) + 1);
  }

  const frameworkSummary = frameworkCount.size === 0
    ? "No endpoints detected"
    : Array.from(frameworkCount.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([framework, count]) => `${framework}: ${count}`)
        .join("\n");

  p.note(
    [
      `Files scanned: ${scanResult.files.length}`,
      `Clusters derived: ${scanResult.clusters.length}`,
      `Endpoints detected: ${endpointCount}`,
      frameworkSummary
    ].join("\n"),
    "Repository summary"
  );
}

async function run(): Promise<void> {
  const program = new Command();
  program
    .name("harness-gen")
    .description("Generate tool-aware agent customization artifacts from a polyglot repository")
    .option("-t, --target <path>", "Target repository path", process.cwd())
    .option("-o, --outputs <items>", "Comma-separated artifact families: instructions,rules,skills,hooks,agents")
    .option("--targets <items>", "Comma-separated tool targets: standard,claude,cursor,copilot,codex")
    .option("--tools <items>", "Alias for --targets")
    .option("--scan-only", "Scan and summarize without generating files", false)
    .option("--dry-run", "Generate content without writing files", false)
    .option("--mock", "Use the built-in mock generator instead of Claude", false)
    .option("--max-files-per-prompt <count>", "Maximum files per prompt window", "25")
    .option("--max-endpoints-per-prompt <count>", "Maximum endpoints per prompt window", "80");

  program.parse(process.argv);
  const parsed = program.opts();

  const options: CliOptions = {
    target: resolveTargetRoot(parsed.target),
    outputs: parseOutputs(parsed.outputs),
    targets: parseTargets(parsed.targets ?? parsed.tools),
    scanOnly: Boolean(parsed.scanOnly),
    dryRun: Boolean(parsed.dryRun),
    mock: Boolean(parsed.mock),
    maxFilesPerPrompt: Number(parsed.maxFilesPerPrompt),
    maxEndpointsPerPrompt: Number(parsed.maxEndpointsPerPrompt)
  };

  p.intro("AI Agent Harness Generator CLI");

  if (!Number.isFinite(options.maxFilesPerPrompt) || options.maxFilesPerPrompt <= 0) {
    throw new Error("--max-files-per-prompt must be a positive number.");
  }

  if (!Number.isFinite(options.maxEndpointsPerPrompt) || options.maxEndpointsPerPrompt <= 0) {
    throw new Error("--max-endpoints-per-prompt must be a positive number.");
  }

  if (!fs.existsSync(options.target) || !fs.statSync(options.target).isDirectory()) {
    p.cancel(`Target directory does not exist: ${options.target}`);
    process.exit(1);
  }

  if (!options.scanOnly && options.outputs.length === 0) {
    if (!process.stdin.isTTY) {
      p.cancel("Non-interactive mode requires --outputs or --scan-only.");
      process.exit(1);
    }

    options.outputs = await promptForOutputs();
  }

  const spinner = p.spinner();
  spinner.start("Scanning repository structure...");
  const scanResult = await analyzeRepository(options.target);

  if (scanResult.files.length === 0) {
    spinner.stop("No supported source files found.");
    p.note(`No .ts, .tsx, .java, or .py files were found under ${options.target}.`, "Graceful exit");
    p.outro("Nothing to generate.");
    return;
  }

  spinner.stop(`Scan complete. ${scanResult.files.length} files mapped into ${scanResult.clusters.length} clusters.`);
  printScanSummary(scanResult);

  if (options.scanOnly) {
    p.outro("Scan complete.");
    return;
  }

  const requests = buildArtifactRequests(scanResult, options.outputs, {
    maxFilesPerPrompt: options.maxFilesPerPrompt,
    maxEndpointsPerPrompt: options.maxEndpointsPerPrompt
  }, options.targets);

  spinner.start(options.dryRun ? "Preparing artifact payloads..." : "Generating artifacts...");
  const generationClient = options.dryRun
    ? new MockGenerationClient()
    : createGenerationClient({
        mock: options.mock,
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: DEFAULT_MODEL
      });
  const generatedArtifacts = await materializeArtifacts(options.target, requests, generationClient, options.dryRun, scanResult);
  spinner.stop(options.dryRun ? `Prepared ${generatedArtifacts.length} artifacts.` : `Generated ${generatedArtifacts.length} artifacts.`);

  p.note(
    generatedArtifacts
      .map((artifact) => artifact.relativePath)
      .sort((left, right) => left.localeCompare(right))
      .join("\n"),
    options.dryRun ? "Artifacts planned" : `Artifacts written via ${generationClient.mode}`
  );

  p.outro(options.dryRun ? "Dry run complete." : "Workspace harness initialized.");
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  p.cancel(message);
  process.exit(1);
});