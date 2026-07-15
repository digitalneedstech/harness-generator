import test from "node:test";
import assert from "node:assert/strict";
import { generateWikis } from "../wiki/generator.js";
import { loadOrgConfig } from "../orgconfig/loader.js";
import path from "node:path";
import fs from "node:fs";

test("Wiki Generator: should generate fixed wikis", () => {
  const tempDir = fs.mkdtempSync("wiki-gen-test-");
  try {
    const orgConfigPath = path.join(tempDir, "org-config.yaml");

    const yaml = `
organization:
  name: "Test Org"
policies:
  security:
    pii_handling: "Scrub all PII"
  custom:
    - policy_name: "pii_handling"
      wiki_file: "pii-handling.md"
`;
    fs.writeFileSync(orgConfigPath, yaml);

    const config = loadOrgConfig(orgConfigPath);
    const wikis = generateWikis(config);

    const filenames = wikis.map((w: any) => w.filename);
    assert(filenames.includes("architecture-diagram.md"));
    assert(filenames.includes("api-patterns-and-conventions.md"));
    assert(filenames.includes("testing-strategy.md"));
    assert(filenames.includes("security-guidelines.md"));
    assert(filenames.includes("deployment-and-ops.md"));
    assert(filenames.includes("troubleshooting.md"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Wiki Generator: should generate dynamic wikis from org config", () => {
  const tempDir = fs.mkdtempSync("wiki-gen-test-");
  try {
    const orgConfigPath = path.join(tempDir, "org-config.yaml");

    const yaml = `
organization:
  name: "Test Org"
policies:
  custom:
    - policy_name: "pii_handling"
      wiki_file: "pii-handling.md"
`;
    fs.writeFileSync(orgConfigPath, yaml);

    const config = loadOrgConfig(orgConfigPath);
    const wikis = generateWikis(config);

    const filenames = wikis.map((w: any) => w.filename);
    assert(filenames.includes("pii-handling.md"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Wiki Generator: should include mermaid diagrams", () => {
  const tempDir = fs.mkdtempSync("wiki-gen-test-");
  try {
    const orgConfigPath = path.join(tempDir, "org-config.yaml");

    const yaml = `
organization:
  name: "Test Org"
`;
    fs.writeFileSync(orgConfigPath, yaml);

    const config = loadOrgConfig(orgConfigPath);
    const wikis = generateWikis(config);

    const archWiki = wikis.find((w) => w.filename === "architecture-diagram.md");
    assert(archWiki?.content.includes("```mermaid"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Wiki Generator: should have correct titles and descriptions", () => {
  const tempDir = fs.mkdtempSync("wiki-gen-test-");
  try {
    const orgConfigPath = path.join(tempDir, "org-config.yaml");

    const yaml = `
organization:
  name: "Test Org"
`;
    fs.writeFileSync(orgConfigPath, yaml);

    const config = loadOrgConfig(orgConfigPath);
    const wikis = generateWikis(config);

    const archWiki = wikis.find((w) => w.filename === "architecture-diagram.md");
    assert.equal(archWiki?.title, "System Architecture");
    assert(archWiki?.description.includes("System architecture"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
