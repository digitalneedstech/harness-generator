import fs from "node:fs";
import path from "node:path";
import type { Baseline, BaselineFile, BaselineCluster, BaselineArtifact, FileSummary, ClusterSummary } from "../types.js";
import { hashContent } from "../cache.js";

const DEFAULT_BASELINE_PATH = ".agent-harness/baseline.json";
const CURRENT_SCHEMA_VERSION = 1;
const CURRENT_HARNESS_VERSION = "1.0.1";

export function resolveBaselinePath(targetRoot: string, baselinePath?: string): string {
  if (baselinePath) {
    return path.isAbsolute(baselinePath) ? baselinePath : path.join(targetRoot, baselinePath);
  }
  return path.join(targetRoot, DEFAULT_BASELINE_PATH);
}

export function loadBaseline(baselinePath: string): Baseline | null {
  if (!fs.existsSync(baselinePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(baselinePath, "utf-8");
    const baseline = JSON.parse(content) as Baseline;
    validateBaseline(baseline);
    return baseline;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load baseline from ${baselinePath}: ${message}`);
  }
}

export function validateBaseline(baseline: Baseline): void {
  if (!baseline.schemaVersion) {
    throw new Error("Baseline missing required field: schemaVersion");
  }

  if (baseline.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Baseline schema version mismatch. Expected ${CURRENT_SCHEMA_VERSION}, got ${baseline.schemaVersion}`
    );
  }

  if (!baseline.generatedAt) {
    throw new Error("Baseline missing required field: generatedAt");
  }

  if (!baseline.harnessGenVersion) {
    throw new Error("Baseline missing required field: harnessGenVersion");
  }

  if (!baseline.targetRootHash) {
    throw new Error("Baseline missing required field: targetRootHash");
  }

  if (!Array.isArray(baseline.files)) {
    throw new Error("Baseline.files must be an array");
  }

  if (!Array.isArray(baseline.clusters)) {
    throw new Error("Baseline.clusters must be an array");
  }

  if (!Array.isArray(baseline.artifacts)) {
    throw new Error("Baseline.artifacts must be an array");
  }

  if (!baseline.thresholds || baseline.thresholds.clusterDriftPercent === undefined) {
    throw new Error("Baseline missing required field: thresholds.clusterDriftPercent");
  }
}

export function createBaselineFromScan(
  targetRoot: string,
  files: FileSummary[],
  clusters: ClusterSummary[],
  artifacts: Array<{ family: string; target: string; relativePath: string; clusterName?: string; sourceFiles: string[] }>
): Baseline {
  const targetRootHash = computeTargetRootHash(targetRoot);

  const baselineFiles: BaselineFile[] = files.map((file) => ({
    filePath: file.filePath,
    hash: file.hash,
    language: file.language,
    dependencies: file.dependencies
  }));

  const baselineClusters: BaselineCluster[] = clusters.map((cluster) => ({
    name: cluster.name,
    files: cluster.files,
    endpointCount: cluster.endpointCount
  }));

  const baselineArtifacts: BaselineArtifact[] = artifacts.map((artifact) => ({
    family: artifact.family as any,
    target: artifact.target as any,
    relativePath: artifact.relativePath,
    clusterName: artifact.clusterName,
    sourceFiles: artifact.sourceFiles
  }));

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    harnessGenVersion: CURRENT_HARNESS_VERSION,
    targetRootHash,
    files: baselineFiles,
    clusters: baselineClusters,
    artifacts: baselineArtifacts,
    thresholds: {
      clusterDriftPercent: 25
    }
  };
}

export function writeBaseline(baseline: Baseline, baselinePath: string): void {
  const dir = path.dirname(baselinePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(baseline, null, 2) + "\n";
  fs.writeFileSync(baselinePath, content, "utf-8");
}

function computeTargetRootHash(targetRoot: string): string {
  // Hash based on file count and names in the root directory
  // This is a simple heuristic to detect major directory rearrangements
  try {
    const entries = fs.readdirSync(targetRoot, { withFileTypes: true });
    const sorted = entries
      .map((e) => `${e.isDirectory() ? "d" : "f"}:${e.name}`)
      .sort()
      .join("|");
    return hashContent(sorted);
  } catch {
    return hashContent(targetRoot);
  }
}
