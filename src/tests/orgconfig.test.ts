import test from "node:test";
import assert from "node:assert/strict";
import { loadOrgConfig } from "../orgconfig/loader.js";
import path from "node:path";
import fs from "node:fs";

test("OrgConfig Loader: should load valid org-config.yaml", () => {
  const tempDir = fs.mkdtempSync("org-config-test-");
  try {
    const configPath = path.join(tempDir, "org-config.yaml");
    const yaml = `
organization:
  name: "Test Corp"
  domain: "test.com"
policies:
  testing:
    minimum_coverage: 75
  api_design:
    authentication:
      method: "oauth2"
`;
    fs.writeFileSync(configPath, yaml);

    const config = loadOrgConfig(configPath);

    assert.equal(config.organization?.name, "Test Corp");
    assert.equal(config.policies?.testing?.minimum_coverage, 75);
    assert.equal(config.policies?.api_design?.authentication?.method, "oauth2");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OrgConfig Loader: should handle missing file", () => {
  assert.throws(() => loadOrgConfig("/nonexistent/path"));
});

test("OrgConfig Loader: should parse custom policies", () => {
  const tempDir = fs.mkdtempSync("org-config-test-");
  try {
    const configPath = path.join(tempDir, "org-config-custom.yaml");
    const yaml = `
policies:
  custom:
    - policy_name: "pii_handling"
      wiki_file: "pii-handling.md"
    - policy_name: "multi_tenancy"
      wiki_file: "multi-tenancy.md"
`;
    fs.writeFileSync(configPath, yaml);

    const config = loadOrgConfig(configPath);

    assert.equal(config.policies?.custom?.length, 2);
    assert.equal(config.policies?.custom?.[0].policy_name, "pii_handling");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
