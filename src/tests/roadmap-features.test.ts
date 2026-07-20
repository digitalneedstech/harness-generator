import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverExtensionFamilies, getFamily, registerBuiltinFamilies, resetFamilyRegistry } from "../registry/familyRegistry.js";
import { computeScore, parseScoreWeights } from "../score/compute.js";
import { assignTier, computeScopes } from "../extensions/providers.js";
import { buildUpgradePlan } from "../self/upgrade.js";
import type { ScanResult } from "../types.js";

const scan: ScanResult = {
  targetRoot: "repo",
  files: [{ filePath: "src/payments.ts", hash: "1", language: "ts", dependencies: ["network"], endpoints: [{ framework: "Express", routePath: "/pay", httpMethod: "POST", signature: "pay" }] }],
  clusters: [{ name: "payments", files: ["src/payments.ts"], endpointCount: 1 }]
};

test("registry seeds built-ins and discovers agent-harness extensions", () => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "harness-registry-"));
  const extension = path.join(target, ".agent-harness", "extensions", "sample");
  fs.mkdirSync(extension, { recursive: true });
  fs.writeFileSync(path.join(extension, "manifest.yaml"), "artifact_family: sample-family\ntargets: [claude]\n");
  resetFamilyRegistry();
  registerBuiltinFamilies();
  discoverExtensionFamilies(target);
  assert.equal(getFamily("rules")?.builtin, true);
  assert.equal(getFamily("sample-family")?.builtin, false);
  fs.rmSync(target, { recursive: true, force: true });
});

test("score validates weights and calculates a bounded result", () => {
  assert.throws(() => parseScoreWeights("coverage=1,drift=1,policy=1"), /sum to 1/);
  const result = computeScore(["payments"], null, null, null, parseScoreWeights("coverage=0.5,drift=0.25,policy=0.25"));
  assert.equal(result.overall, 50);
  assert.equal(result.coverage, 0);
  assert.equal(result.policyCoverage, 100);
});

test("permissions and cost-policy providers classify high-risk clusters", () => {
  const scopes = computeScopes(scan.clusters[0]!, scan, ["rm -rf"]);
  assert.deepEqual(scopes.allow, ["read_file", "grep_search"]);
  assert.ok(scopes.ask.includes("network"));
  assert.ok(scopes.deny.includes("rm -rf"));
  assert.equal(assignTier(scan.clusters[0]!, scan).tier, "frontier");
});

test("self upgrade exposes a safe explicit installer plan", () => {
  const plan = buildUpgradePlan("1.2.3");
  if (plan.supported) {
    assert.deepEqual(plan.args, ["install", "--global", "agent-harness-cli@1.2.3"]);
  } else {
    assert.match(plan.reason ?? "", /npm script|npx\/local/);
  }
});
