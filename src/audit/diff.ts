import type {
  AuditFinding,
  AuditSummary,
  Baseline,
  BaselineFile,
  BaselineCluster,
  BaselineArtifact,
  FileSummary,
  ClusterSummary
} from "../types.js";

interface DiffContext {
  baseline: Baseline;
  liveFiles: FileSummary[];
  liveClusters: ClusterSummary[];
  clusterDriftThreshold: number;
}

export function computeAuditDiff(
  baseline: Baseline,
  liveFiles: FileSummary[],
  liveClusters: ClusterSummary[],
  clusterDriftThreshold: number = 25
): { findings: AuditFinding[]; summary: AuditSummary } {
  const context: DiffContext = {
    baseline,
    liveFiles,
    liveClusters,
    clusterDriftThreshold
  };

  const findings: AuditFinding[] = [];

  // Check for file changes
  const fileChanges = detectFileChanges(context);
  findings.push(...fileChanges);

  // Check for cluster composition drift
  const clusterDrift = detectClusterDrift(context);
  findings.push(...clusterDrift);

  // Check for stale artifact references
  const staleArtifacts = detectStaleArtifacts(context);
  findings.push(...staleArtifacts);

  // Compute summary
  const summary = computeSummary(findings);

  return { findings, summary };
}

function detectFileChanges(context: DiffContext): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const baselineFileMap = new Map(context.baseline.files.map((f) => [f.filePath, f]));
  const liveFileMap = new Map(context.liveFiles.map((f) => [f.filePath, f]));
  const baselineFilePaths = new Set(context.baseline.files.map((f) => f.filePath));
  const liveFilePaths = new Set(context.liveFiles.map((f) => f.filePath));

  // Check for added files
  const addedFiles = Array.from(liveFilePaths).filter((f) => !baselineFilePaths.has(f));
  if (addedFiles.length > 0) {
    findings.push({
      severity: "warning",
      code: "FILE_ADDED",
      message: `${addedFiles.length} new source file(s) detected.`,
      paths: addedFiles,
      recommendation: "If these files are part of a new feature or component, ensure they are covered by harness artifacts.",
      blocking: false
    });
  }

  // Check for deleted files
  const deletedFiles = Array.from(baselineFilePaths).filter((f) => !liveFilePaths.has(f));
  if (deletedFiles.length > 0) {
    findings.push({
      severity: "info",
      code: "FILE_DELETED",
      message: `${deletedFiles.length} source file(s) were removed.`,
      paths: deletedFiles,
      recommendation: "Verify baseline artifacts are still valid.",
      blocking: false
    });
  }

  // Check for hash changes in existing files
  const changedFiles: string[] = [];
  for (const filePath of Array.from(baselineFilePaths)) {
    if (liveFilePaths.has(filePath)) {
      const baselineFile = baselineFileMap.get(filePath)!;
      const liveFile = liveFileMap.get(filePath)!;
      if (baselineFile.hash !== liveFile.hash) {
        changedFiles.push(filePath);
      }
    }
  }

  if (changedFiles.length > 0) {
    findings.push({
      severity: "info",
      code: "FILE_HASH_CHANGED",
      message: `${changedFiles.length} file(s) have changed content.`,
      paths: changedFiles,
      recommendation: "Review changes to ensure no breaking changes to the API surface.",
      blocking: false
    });
  }

  return findings;
}

function detectClusterDrift(context: DiffContext): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const baselineClusterMap = new Map(context.baseline.clusters.map((c) => [c.name, c]));
  const liveClusterMap = new Map(context.liveClusters.map((c) => [c.name, c]));

  const baselineClusterNames = new Set(context.baseline.clusters.map((c) => c.name));
  const liveClusterNames = new Set(context.liveClusters.map((c) => c.name));

  // Check for new clusters (uncovered code)
  const newClusters = Array.from(liveClusterNames).filter((name) => !baselineClusterNames.has(name));
  if (newClusters.length > 0) {
    const newClusterDetails = newClusters
      .map((name) => {
        const cluster = liveClusterMap.get(name)!;
        return `${name} (${cluster.files.length} files)`;
      })
      .join(", ");

    findings.push({
      severity: "error",
      code: "NEW_UNCOVERED_CLUSTER",
      message: `${newClusters.length} new cluster(s) detected: ${newClusterDetails}`,
      paths: newClusters.flatMap((name) => liveClusterMap.get(name)!.files),
      recommendation:
        "Review the new cluster(s) and update harness artifacts (agents, skills, rules, instructions) to cover the new code. Then run 'harness-gen audit --update-baseline'.",
      blocking: true
    });
  }

  // Check for composition drift in existing clusters
  const driftedClusters: Array<{ name: string; drift: number; baselineFiles: string[]; liveFiles: string[] }> = [];

  for (const clusterName of Array.from(baselineClusterNames)) {
    if (liveClusterMap.has(clusterName)) {
      const baselineCluster = baselineClusterMap.get(clusterName)!;
      const liveCluster = liveClusterMap.get(clusterName)!;

      const drift = calculateDrift(baselineCluster.files, liveCluster.files);

      if (drift > context.clusterDriftThreshold) {
        driftedClusters.push({
          name: clusterName,
          drift,
          baselineFiles: baselineCluster.files,
          liveFiles: liveCluster.files
        });
      }
    }
  }

  if (driftedClusters.length > 0) {
    findings.push({
      severity: "warning",
      code: "CLUSTER_COMPOSITION_DRIFT",
      message: `${driftedClusters.length} cluster(s) have changed composition beyond the ${context.clusterDriftThreshold}% threshold.`,
      paths: driftedClusters.flatMap((c) => c.liveFiles),
      recommendation:
        "Review cluster composition changes and update harness artifacts if needed. Consider regenerating affected artifacts.",
      blocking: false
    });
  }

  return findings;
}

function detectStaleArtifacts(context: DiffContext): AuditFinding[] {
  const findings: AuditFinding[] = [];

  const liveFilePaths = new Set(context.liveFiles.map((f) => f.filePath));
  const staleReferences: string[] = [];

  for (const artifact of context.baseline.artifacts) {
    for (const sourceFile of artifact.sourceFiles) {
      if (!liveFilePaths.has(sourceFile)) {
        staleReferences.push(`${artifact.relativePath} -> ${sourceFile}`);
      }
    }
  }

  if (staleReferences.length > 0) {
    const uniqueArtifacts = new Set(staleReferences.map((ref) => ref.split(" -> ")[0]));

    findings.push({
      severity: "error",
      code: "STALE_ARTIFACT_REFERENCE",
      message: `${uniqueArtifacts.size} artifact(s) reference deleted or moved source file(s).`,
      paths: Array.from(uniqueArtifacts),
      recommendation:
        "Remove or update the stale artifact references. Delete the artifact file or update its source file list. Then run 'harness-gen audit --update-baseline'.",
      blocking: true
    });
  }

  return findings;
}

function calculateDrift(baselineFiles: string[], liveFiles: string[]): number {
  // Calculate percentage of file membership change
  const baselineSet = new Set(baselineFiles);
  const liveSet = new Set(liveFiles);

  const added = liveFiles.filter((f) => !baselineSet.has(f)).length;
  const removed = baselineFiles.filter((f) => !liveSet.has(f)).length;
  const total = Math.max(baselineFiles.length, liveFiles.length);

  if (total === 0) {
    return 0;
  }

  return ((added + removed) / total) * 100;
}

function computeSummary(findings: AuditFinding[]): AuditSummary {
  let filesAdded = 0;
  let filesDeleted = 0;
  let clustersChanged = 0;
  let staleArtifacts = 0;
  let blockingFindings = 0;

  for (const finding of findings) {
    if (finding.blocking) {
      blockingFindings++;
    }

    switch (finding.code) {
      case "FILE_ADDED":
        filesAdded = finding.paths.length;
        break;
      case "FILE_DELETED":
        filesDeleted = finding.paths.length;
        break;
      case "CLUSTER_COMPOSITION_DRIFT":
        clustersChanged++;
        break;
      case "STALE_ARTIFACT_REFERENCE":
        staleArtifacts = finding.paths.length;
        break;
    }
  }

  return {
    filesAdded,
    filesDeleted,
    clustersChanged,
    staleArtifacts,
    blockingFindings
  };
}
