#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import * as p from "@clack/prompts";
import { analyzeRepository } from "./analyzer.js";
import { createGenerationClient, MockGenerationClient } from "./llm/client.js";
import { buildArtifactRequests } from "./llm/prompts.js";
import { resolveTargetRoot } from "./paths.js";
import type { ArtifactFamily, CliOptions, ScanResult, TargetTool } from "./types.js";
import { materializeArtifacts } from "./writers.js";
import { buildArchetypeCommand } from "./archetypes/command.js";
import { buildAuditCommand } from "./audit/command.js";
import { buildScoreCommand } from "./score/command.js";
import { buildValidateCommand } from "./validate/command.js";
import { buildSelfCommand } from "./self/command.js";
import { buildExtensionCommand } from "./extensions/command.js";
import { buildCostCommand, buildPermissionsCommand } from "./extensions/inspectCommand.js";
import { buildExtensionRequests } from "./extensions/providers.js";
import { discoverExtensionFamilies, getFamily, registerBuiltinFamilies, resetFamilyRegistry } from "./registry/familyRegistry.js";
import { loadOrgConfigIfExists } from "./orgconfig/loader.js";

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

      if (getFamily(entry)) {
        return entry;
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
  // Intercept subcommands before Commander setup — registering subcommands on the
  // parent causes Commander v13+ to show help when the parent is invoked directly.
  if (process.argv[2] === "archetype") {
    const sub = buildArchetypeCommand();
    await sub.parseAsync(["node", "archetype"].concat(process.argv.slice(3)));
    return;
  }

  if (process.argv[2] === "audit") {
    const sub = buildAuditCommand();
    await sub.parseAsync(["node", "audit"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "score") {
    const sub = buildScoreCommand();
    await sub.parseAsync(["node", "score"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "validate") {
    resetFamilyRegistry();
    registerBuiltinFamilies();
    const sub = buildValidateCommand();
    await sub.parseAsync(["node", "validate"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "self") {
    const sub = buildSelfCommand();
    await sub.parseAsync(["node", "self"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "extension") {
    const sub = buildExtensionCommand();
    await sub.parseAsync(["node", "extension"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "permissions") {
    const sub = buildPermissionsCommand();
    await sub.parseAsync(["node", "permissions"].concat(process.argv.slice(3)));
    return;
  }
  if (process.argv[2] === "cost") {
    const sub = buildCostCommand();
    await sub.parseAsync(["node", "cost"].concat(process.argv.slice(3)));
    return;
  }

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
    .option("--org-config <path>", "Path to org-config.yaml (optional)")
    .option("--max-files-per-prompt <count>", "Maximum files per prompt window", "25")
    .option("--max-endpoints-per-prompt <count>", "Maximum endpoints per prompt window", "80");

  program.parse(process.argv);

  const parsed = program.opts();

  resetFamilyRegistry();
  registerBuiltinFamilies();
  discoverExtensionFamilies(resolveTargetRoot(parsed.target));

  const options: CliOptions = {
    target: resolveTargetRoot(parsed.target),
    outputs: parseOutputs(parsed.outputs),
    targets: parseTargets(parsed.targets ?? parsed.tools),
    scanOnly: Boolean(parsed.scanOnly),
    dryRun: Boolean(parsed.dryRun),
    mock: Boolean(parsed.mock),
    orgConfig: parsed.orgConfig,
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
  const orgConfig = options.orgConfig ? loadOrgConfigIfExists(options.orgConfig) : null;
  if (options.orgConfig && !orgConfig) {
    throw new Error(`Org config not found: ${options.orgConfig}`);
  }
  requests.push(...buildExtensionRequests(scanResult, options.outputs, options.targets, orgConfig));

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