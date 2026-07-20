import fs from "node:fs";
import path from "node:path";
import type { Baseline, OrgConfig, ScanResult, ValidationFinding, ValidationReport } from "../types.js";
import { registeredFamilies } from "../registry/familyRegistry.js";

function findReferences(content: string): string[] {
  return [...content.matchAll(/(?:skill|agent)\s*:\s*['"]?([^'"\s]+)/gi)].map((match) => match[1]!);
}

export function validateArtifacts(targetRoot: string, scan: ScanResult, baseline: Baseline | null, orgConfig: OrgConfig | null): ValidationReport {
  const findings: ValidationFinding[] = [];
  const artifacts = baseline?.artifacts ?? [];
  for (const artifact of artifacts) {
    const artifactPath = path.join(targetRoot, artifact.relativePath);
    if (!fs.existsSync(artifactPath)) {
      findings.push({ severity: "error", code: "MISSING_ARTIFACT", message: `Baseline artifact is missing: ${artifact.relativePath}`, path: artifact.relativePath });
      continue;
    }
    const content = fs.readFileSync(artifactPath, "utf-8");
    for (const reference of findReferences(content)) {
      const candidate = path.join(targetRoot, reference);
      if (!fs.existsSync(candidate)) findings.push({ severity: "warning", code: "DANGLING_REFERENCE", message: `${artifact.relativePath} references missing ${reference}`, path: artifact.relativePath });
    }
  }
  for (const cluster of scan.clusters) {
    if (!artifacts.some((artifact) => artifact.clusterName === cluster.name && artifact.family === "agents")) {
      findings.push({ severity: "warning", code: "ORPHANED_CLUSTER", message: `Cluster ${cluster.name} has no scoped agent.` });
    }
  }
  for (const policy of Object.keys(orgConfig?.policies ?? {})) {
    const requiredFamily = policy === "permissions" ? "permissions" : policy === "cost_policy" ? "cost-policy" : "rules";
    if (!artifacts.some((artifact) => artifact.family === requiredFamily)) {
      findings.push({ severity: "warning", code: "POLICY_WITHOUT_ENFORCEMENT", message: `Policy ${policy} has no ${requiredFamily} enforcement artifact.` });
    }
  }
  const overrides = path.join(targetRoot, ".agent-harness", "overrides");
  if (fs.existsSync(overrides)) {
    const families = new Set(registeredFamilies().map((family) => family.name));
    for (const entry of fs.readdirSync(overrides, { withFileTypes: true })) {
      if (entry.isDirectory() && !families.has(entry.name)) findings.push({ severity: "warning", code: "UNREGISTERED_FAMILY", message: `Override directory uses unregistered family ${entry.name}`, path: path.join(".agent-harness", "overrides", entry.name) });
    }
  }
  return { valid: !findings.some((finding) => finding.severity === "error"), findings };
}
