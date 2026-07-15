import test from "node:test";
import assert from "node:assert/strict";
import { loadOrgConfig } from "../orgconfig/loader.js";
import { generateWikis } from "../wiki/generator.js";
import { generateEnforcementArtifacts } from "../enforcement/policyToArtifacts.js";
import { validateOrgConfigStrict } from "../orgconfig/validator.js";
import path from "node:path";
import fs from "node:fs";

test("E2E: Org-Config + Wiki + Enforcement Integration", () => {
  const tempProjectDir = fs.mkdtempSync("e2e-project-");
  try {
    const tempOrgConfigPath = path.join(tempProjectDir, "org-config.yaml");

    // Write test org-config
    const yaml = `
organization:
  name: "E2E Test Org"
  domain: "e2e.test"
policies:
  testing:
    minimum_coverage: 75
  api_design:
    authentication:
      method: "oauth2"
  security:
    pii_handling: "Scrub all PII from logs"
  custom:
    - policy_name: "pii_handling"
      wiki_file: "pii-handling.md"
stacks:
  typescript:
    build_command: "npm run build"
    test_command: "npm test"
`;
    fs.writeFileSync(tempOrgConfigPath, yaml);

    // Test 1: Validate org-config without errors
    const config = loadOrgConfig(tempOrgConfigPath);
    assert.doesNotThrow(() => validateOrgConfigStrict(config));

    // Test 2: Generate all fixed + dynamic wikis
    const wikis = generateWikis(config);
    const filenames = wikis.map((w: any) => w.filename);
    assert(filenames.includes("architecture-diagram.md"));
    assert(filenames.includes("api-patterns-and-conventions.md"));
    assert(filenames.includes("testing-strategy.md"));
    assert(filenames.includes("security-guidelines.md"));
    assert(filenames.includes("deployment-and-ops.md"));
    assert(filenames.includes("troubleshooting.md"));
    assert(filenames.includes("pii-handling.md"));

    // Test 3: Generate enforcement artifacts from all policies
    const artifacts = generateEnforcementArtifacts(config);
    const families = artifacts.map((a: any) => a.family);
    assert(families.includes("rules"));
    assert(families.includes("agents"));

    // Test 4: Check coverage of policies
    const enforcedPolicies = artifacts.map((a: any) => a.enforcedPolicy);
    assert(enforcedPolicies.includes("testing.minimum_coverage"));
    assert(enforcedPolicies.includes("api_design"));
    assert(enforcedPolicies.includes("security"));

    // Test 5: Reference wikis in enforcement artifacts
    const allContent = artifacts.map((a: any) => a.content).join("\n");
    assert(allContent.includes("wiki/"));
    assert(allContent.includes("api-patterns-and-conventions.md"));
    assert(allContent.includes("testing-strategy.md"));
    assert(allContent.includes("security-guidelines.md"));

    // Test 6: Valid mermaid diagrams in wikis
    const mermaidWikis = wikis.filter((w: any) => w.content.includes("```mermaid"));
    assert(mermaidWikis.length > 0);

    // Test 7: Mermaid blocks are closed
    for (const wiki of mermaidWikis) {
      const openCount = (wiki.content.match(/```mermaid/g) || []).length;
      const closeCount = (wiki.content.match(/```/g) || []).length;
      assert(closeCount >= openCount * 2, "Mermaid blocks not properly closed");
    }

    // Test 8: Verify organization metadata is preserved
    assert.equal(config.organization?.name, "E2E Test Org");
    assert.equal(config.organization?.domain, "e2e.test");
  } finally {
    fs.rmSync(tempProjectDir, { recursive: true, force: true });
  }
});
