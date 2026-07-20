import type { ClusterSummary, OrgConfig, PlannedArtifact, ScanResult, TargetTool } from "../types.js";

export interface PermissionScopes {
  allow: string[];
  deny: string[];
  ask: string[];
}

const SENSITIVE = /(\.env|secret|credential|token|password|auth|payment|network|socket|http)/i;
const UI_OR_DOCS = /(^|\/)(ui|docs?|readme|components?)(\/|$)|\.(md|mdx|css|scss)$/i;

export function computeScopes(cluster: ClusterSummary, scan: ScanResult, mandatoryDeny: string[] = []): PermissionScopes {
  const files = cluster.files.map((filePath) => scan.files.find((file) => file.filePath === filePath)).filter(Boolean);
  const sensitive = files.some((file) => SENSITIVE.test(file!.filePath) || file!.dependencies.some((dependency) => SENSITIVE.test(dependency)));
  const lowRisk = files.length > 0 && files.every((file) => UI_OR_DOCS.test(file!.filePath));
  const deny = [...new Set(mandatoryDeny)].sort();
  if (sensitive) {
    return { allow: ["read_file", "grep_search"], deny, ask: ["apply_patch", "run_in_terminal", "network"] };
  }
  if (lowRisk) {
    return { allow: ["read_file", "grep_search", "apply_patch"], deny, ask: ["run_in_terminal"] };
  }
  return { allow: ["read_file", "grep_search", "apply_patch"], deny, ask: ["run_in_terminal", "network"] };
}

export function assignTier(cluster: ClusterSummary, scan: ScanResult): { tier: "lightweight" | "frontier"; explanation: string } {
  const files = cluster.files.map((filePath) => scan.files.find((file) => file.filePath === filePath)).filter(Boolean);
  const endpoints = files.reduce((sum, file) => sum + file!.endpoints.length, 0);
  const dependencyCount = files.reduce((sum, file) => sum + file!.dependencies.length, 0);
  const critical = files.some((file) => /(payment|auth|security|billing|identity)/i.test(file!.filePath));
  const tier = endpoints >= 4 || dependencyCount >= 12 || critical ? "frontier" : "lightweight";
  return {
    tier,
    explanation: `${cluster.name}: ${endpoints} endpoints, ${dependencyCount} dependencies${critical ? ", business-critical signals detected" : ""} → ${tier} tier suggested`
  };
}

function slugPath(cluster: ClusterSummary): string {
  return cluster.name.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function buildExtensionRequests(
  scan: ScanResult,
  outputs: string[],
  targets: TargetTool[],
  orgConfig: OrgConfig | null
): PlannedArtifact[] {
  const requests: PlannedArtifact[] = [];
  const targetSet = new Set(targets.includes("standard") ? ["claude", "cursor", "copilot", "codex"] : targets);

  for (const cluster of scan.clusters) {
    const slug = slugPath(cluster);
    if (outputs.includes("permissions")) {
      const scopes = computeScopes(cluster, scan, orgConfig?.policies?.permissions?.deny ?? []);
      if (targetSet.has("claude")) {
        requests.push({
          family: "permissions",
          target: "claude",
          renderKind: "extension-prose",
          relativePath: ".claude/settings.json",
          promptWindows: [], slug, title: `${cluster.name} permissions`, llmRequired: false,
          content: JSON.stringify({ permissions: scopes }, null, 2)
        });
      }
      for (const target of [...targetSet].filter((value) => value !== "claude") as TargetTool[]) {
        requests.push({
          family: "permissions", target, renderKind: "extension-prose",
          relativePath: `.agent-harness/advisories/permissions-${slug}-${target}.md`,
          promptWindows: [], slug, title: `${cluster.name} permission guidance`, llmRequired: false,
          content: `# Permission guidance (advisory only)\n\nCluster: ${cluster.name}\n\nAllow: ${scopes.allow.join(", ") || "none"}\n\nAsk first: ${scopes.ask.join(", ") || "none"}\n\nDeny: ${scopes.deny.join(", ") || "none"}\n`
        });
      }
    }

    if (outputs.includes("cost-policy")) {
      const suggestion = assignTier(cluster, scan);
      const budget = orgConfig?.policies?.cost_policy?.max_token_budget;
      for (const target of targetSet as Set<TargetTool>) {
        requests.push({
          family: "cost-policy", target, renderKind: "extension-prose",
          relativePath: `.agent-harness/${target === "claude" ? "cost-policy" : "advisories"}/cost-policy-${slug}-${target}.${target === "claude" ? "json" : "md"}`,
          promptWindows: [], slug, title: `${cluster.name} cost policy`, llmRequired: false,
          content: target === "claude"
            ? JSON.stringify({ cluster: cluster.name, model: suggestion.tier, maxTokenBudget: budget }, null, 2)
            : `# Cost policy guidance (advisory only)\n\n${suggestion.explanation}\n${budget ? `\nMaximum token budget: ${budget}` : ""}\n`
        });
      }
    }
  }
  return requests;
}
