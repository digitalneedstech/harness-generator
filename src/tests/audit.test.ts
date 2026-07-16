import test from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Baseline, FileSummary, ClusterSummary } from "../types.js";
import {
  resolveBaselinePath,
  loadBaseline,
  validateBaseline,
  createBaselineFromScan,
  writeBaseline
} from "../audit/baseline.js";
import { computeAuditDiff } from "../audit/diff.js";
import { renderReport } from "../audit/report.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures", "audit");

// Ensure fixtures directory exists
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

test("Baseline: resolveBaselinePath with default", () => {
  const target = path.join("my", "repo");
  const resolved = resolveBaselinePath(target);
  const normalized = resolved.replace(/\\/g, "/");
  assert(
    normalized.includes(".agent-harness") && normalized.includes("baseline.json"),
    `Expected resolved path to include .agent-harness and baseline.json, got ${resolved}`
  );
});

test("Baseline: resolveBaselinePath with custom", () => {
  const target = "/my/repo";
  const resolved = resolveBaselinePath(target, "custom-baseline.json");
  assert(resolved.endsWith("custom-baseline.json"));
});

test("Baseline: createBaselineFromScan", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/index.ts",
      hash: "abc123",
      language: "ts",
      endpoints: [],
      dependencies: []
    }
  ];

  const clusters: ClusterSummary[] = [
    {
      name: "src-index",
      files: ["src/index.ts"],
      endpointCount: 0
    }
  ];

  const baseline = createBaselineFromScan("/repo", files, clusters, []);

  assert.equal(baseline.schemaVersion, 1);
  assert(baseline.generatedAt);
  assert.equal(baseline.harnessGenVersion, "1.0.1");
  assert.equal(baseline.files.length, 1);
  assert.equal(baseline.files[0].filePath, "src/index.ts");
  assert.equal(baseline.clusters.length, 1);
  assert.equal(baseline.thresholds.clusterDriftPercent, 25);
});

test("Baseline: writeBaseline and loadBaseline", () => {
  const testDir = path.join(fixturesDir, "test-baseline");
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const baselinePath = path.join(testDir, "baseline.json");

  // Create and write
  const file: FileSummary = {
    filePath: "test.ts",
    hash: "hash1",
    language: "ts",
    endpoints: [],
    dependencies: []
  };

  const baseline = createBaselineFromScan("/repo", [file], [], []);
  writeBaseline(baseline, baselinePath);

  // Load back
  const loaded = loadBaseline(baselinePath);
  assert(loaded);
  assert.equal(loaded.schemaVersion, 1);
  assert.equal(loaded.files.length, 1);

  // Cleanup
  fs.unlinkSync(baselinePath);
});

test("Baseline: validateBaseline rejects missing schemaVersion", () => {
  const invalid = {} as Baseline;

  assert.throws(() => {
    validateBaseline(invalid);
  }, /schemaVersion/);
});

test("Audit: pass when live matches baseline", () => {
  const file: FileSummary = {
    filePath: "src/index.ts",
    hash: "abc123",
    language: "ts",
    endpoints: [],
    dependencies: []
  };

  const cluster: ClusterSummary = {
    name: "src-index",
    files: ["src/index.ts"],
    endpointCount: 0
  };

  const baseline: Baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    harnessGenVersion: "1.0.1",
    targetRootHash: "root123",
    files: [
      {
        filePath: "src/index.ts",
        hash: "abc123",
        language: "ts",
        dependencies: []
      }
    ],
    clusters: [
      {
        name: "src-index",
        files: ["src/index.ts"],
        endpointCount: 0
      }
    ],
    artifacts: [],
    thresholds: {
      clusterDriftPercent: 25
    }
  };

  const { findings, summary } = computeAuditDiff(baseline, [file], [cluster]);

  assert.equal(findings.length, 0);
  assert.equal(summary.blockingFindings, 0);
});

test("Audit: fail on new uncovered cluster", () => {
  const baselineFile: FileSummary = {
    filePath: "src/old.ts",
    hash: "old123",
    language: "ts",
    endpoints: [],
    dependencies: []
  };

  const newFile: FileSummary = {
    filePath: "src/new.ts",
    hash: "new123",
    language: "ts",
    endpoints: [],
    dependencies: []
  };

  const baseline: Baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    harnessGenVersion: "1.0.1",
    targetRootHash: "root123",
    files: [
      {
        filePath: "src/old.ts",
        hash: "old123",
        language: "ts",
        dependencies: []
      }
    ],
    clusters: [
      {
        name: "src-old",
        files: ["src/old.ts"],
        endpointCount: 0
      }
    ],
    artifacts: [],
    thresholds: {
      clusterDriftPercent: 25
    }
  };

  const { findings } = computeAuditDiff(
    baseline,
    [baselineFile, newFile],
    [
      {
        name: "src-old",
        files: ["src/old.ts"],
        endpointCount: 0
      },
      {
        name: "src-new",
        files: ["src/new.ts"],
        endpointCount: 0
      }
    ]
  );

  const blockingFinding = findings.find(
    (f) => f.code === "NEW_UNCOVERED_CLUSTER" && f.blocking
  );
  assert(blockingFinding);
  assert.equal(blockingFinding.severity, "error");
});

test("Audit: fail on stale artifact reference", () => {
  const file: FileSummary = {
    filePath: "src/index.ts",
    hash: "abc123",
    language: "ts",
    endpoints: [],
    dependencies: []
  };

  const baseline: Baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    harnessGenVersion: "1.0.1",
    targetRootHash: "root123",
    files: [
      {
        filePath: "src/index.ts",
        hash: "abc123",
        language: "ts",
        dependencies: []
      },
      {
        filePath: "src/deleted.ts",
        hash: "del123",
        language: "ts",
        dependencies: []
      }
    ],
    clusters: [
      {
        name: "src-index",
        files: ["src/index.ts"],
        endpointCount: 0
      }
    ],
    artifacts: [
      {
        family: "agents",
        target: "claude",
        relativePath: ".claude/agents/deleted.agent.md",
        sourceFiles: ["src/deleted.ts"]
      }
    ],
    thresholds: {
      clusterDriftPercent: 25
    }
  };

  const { findings } = computeAuditDiff(baseline, [file], [
    {
      name: "src-index",
      files: ["src/index.ts"],
      endpointCount: 0
    }
  ]);

  const staleRef = findings.find(
    (f) => f.code === "STALE_ARTIFACT_REFERENCE" && f.blocking
  );
  assert(staleRef);
  assert.equal(staleRef.severity, "error");
});

test("Report: renderReport text format", () => {
  const report = {
    status: "pass" as const,
    summary: {
      filesAdded: 0,
      filesDeleted: 0,
      clustersChanged: 0,
      staleArtifacts: 0,
      blockingFindings: 0
    },
    findings: []
  };

  const rendered = renderReport(report, "text");
  assert(rendered.includes("HARNESS AUDIT REPORT"));
  assert(rendered.includes("PASS"));
  assert(rendered.includes("No drift detected"));
});

test("Report: renderReport markdown format", () => {
  const report = {
    status: "pass" as const,
    summary: {
      filesAdded: 0,
      filesDeleted: 0,
      clustersChanged: 0,
      staleArtifacts: 0,
      blockingFindings: 0
    },
    findings: []
  };

  const rendered = renderReport(report, "markdown");
  assert(rendered.includes("# Harness Drift Check"));
  assert(rendered.includes("✅"));
  assert(rendered.includes("## Status"));
});

test("Report: renderReport json format", () => {
  const report = {
    status: "pass" as const,
    summary: {
      filesAdded: 0,
      filesDeleted: 0,
      clustersChanged: 0,
      staleArtifacts: 0,
      blockingFindings: 0
    },
    findings: []
  };

  const rendered = renderReport(report, "json");
  const parsed = JSON.parse(rendered);

  assert.equal(parsed.status, "pass");
  assert.equal(parsed.summary.blockingFindings, 0);
});

test("Audit: cluster composition drift detection", () => {
  const baseline: Baseline = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    harnessGenVersion: "1.0.1",
    targetRootHash: "root123",
    files: [
      { filePath: "a.ts", hash: "h1", language: "ts", dependencies: [] },
      { filePath: "b.ts", hash: "h2", language: "ts", dependencies: [] },
      { filePath: "c.ts", hash: "h3", language: "ts", dependencies: [] },
      { filePath: "d.ts", hash: "h4", language: "ts", dependencies: [] }
    ],
    clusters: [
      {
        name: "cluster1",
        files: ["a.ts", "b.ts", "c.ts", "d.ts"],
        endpointCount: 0
      }
    ],
    artifacts: [],
    thresholds: {
      clusterDriftPercent: 25
    }
  };

  // 75% of original files = 3 files remain, 1 deleted
  // Plus 2 new files = big drift
  const liveFiles: FileSummary[] = [
    { filePath: "a.ts", hash: "h1", language: "ts", endpoints: [], dependencies: [] },
    { filePath: "b.ts", hash: "h2", language: "ts", endpoints: [], dependencies: [] },
    { filePath: "c.ts", hash: "h3", language: "ts", endpoints: [], dependencies: [] },
    { filePath: "e.ts", hash: "h5", language: "ts", endpoints: [], dependencies: [] },
    { filePath: "f.ts", hash: "h6", language: "ts", endpoints: [], dependencies: [] }
  ];

  const liveClusters: ClusterSummary[] = [
    {
      name: "cluster1",
      files: ["a.ts", "b.ts", "c.ts", "e.ts", "f.ts"],
      endpointCount: 0
    }
  ];

  const { findings } = computeAuditDiff(baseline, liveFiles, liveClusters, 25);

  const driftFinding = findings.find((f) => f.code === "CLUSTER_COMPOSITION_DRIFT");
  assert(driftFinding, "Should find cluster composition drift");
});
