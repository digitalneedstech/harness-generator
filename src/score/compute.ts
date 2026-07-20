import type { AuditSummary, Baseline, OrgConfig, ScoreResult, ScoreWeights } from "../types.js";

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = { coverage: 0.4, drift: 0.35, policy: 0.25 };

export function parseScoreWeights(value?: string): ScoreWeights {
  if (!value) return DEFAULT_SCORE_WEIGHTS;
  const weights = { ...DEFAULT_SCORE_WEIGHTS };
  for (const part of value.split(",")) {
    const [key, rawValue] = part.split("=").map((item) => item.trim());
    if (key !== "coverage" && key !== "drift" && key !== "policy") throw new Error(`Unknown score weight: ${key}`);
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid score weight for ${key}`);
    weights[key] = parsed;
  }
  const total = weights.coverage + weights.drift + weights.policy;
  if (Math.abs(total - 1) > 0.0001) throw new Error("Score weights must sum to 1.");
  return weights;
}

export function computeScore(
  clusterNames: string[],
  baseline: Baseline | null,
  audit: AuditSummary | null,
  orgConfig: OrgConfig | null,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): ScoreResult {
  const baselineArtifacts = baseline?.artifacts ?? [];
  const coverage = clusterNames.length === 0 ? 100 : Math.round((clusterNames.filter((cluster) =>
    baselineArtifacts.some((artifact) => artifact.clusterName === cluster)
  ).length / clusterNames.length) * 100);
  const auditTotal = audit ? audit.filesAdded + audit.filesDeleted + audit.clustersChanged + audit.staleArtifacts : 0;
  const driftPenalty = audit ? Math.min(100, audit.blockingFindings * 25 + auditTotal * 5) : 0;
  const policies = Object.entries(orgConfig?.policies ?? {}).filter(([name]) => ["testing", "security", "api_design", "permissions", "cost_policy"].includes(name));
  const enforced = new Set(baselineArtifacts.map((artifact) => artifact.family));
  const policyCoverage = policies.length === 0 ? 100 : Math.round((policies.filter(([name]) =>
    name === "permissions" ? enforced.has("permissions") : name === "cost_policy" ? enforced.has("cost-policy") : enforced.has("rules")
  ).length / policies.length) * 100);
  const overall = Math.round(coverage * weights.coverage + (100 - driftPenalty) * weights.drift + policyCoverage * weights.policy);
  return {
    overall, coverage, driftPenalty, policyCoverage, weights,
    perCluster: Object.fromEntries(clusterNames.map((name) => [name, baselineArtifacts.some((artifact) => artifact.clusterName === name) ? 100 : 0]))
  };
}
