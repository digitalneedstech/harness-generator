import test from "node:test";
import assert from "node:assert/strict";
import { validateOrgConfig, validateOrgConfigStrict } from "../orgconfig/validator.js";
import { loadOrgConfig } from "../orgconfig/loader.js";
import path from "node:path";
import fs from "node:fs";

test("OrgConfig Validator: should validate valid config", () => {
  const tempDir = fs.mkdtempSync("validator-test-");
  try {
    const configPath = path.join(tempDir, "valid.yaml");
    const yaml = `
policies:
  testing:
    minimum_coverage: 75
  api_design:
    authentication:
      method: "oauth2"
`;
    fs.writeFileSync(configPath, yaml);
    const config = loadOrgConfig(configPath);

    const result = validateOrgConfig(config);
    assert.equal(result.valid, true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OrgConfig Validator: should reject invalid coverage (>100)", () => {
  const tempDir = fs.mkdtempSync("validator-test-");
  try {
    const configPath = path.join(tempDir, "invalid.yaml");
    const yaml = `
policies:
  testing:
    minimum_coverage: 150
`;
    fs.writeFileSync(configPath, yaml);
    const config = loadOrgConfig(configPath);

    const result = validateOrgConfig(config);
    assert.equal(result.valid, false);
    assert(result.errors?.some((e) => e.includes("minimum_coverage")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OrgConfig Validator: should reject invalid auth method", () => {
  const tempDir = fs.mkdtempSync("validator-test-");
  try {
    const configPath = path.join(tempDir, "invalid-auth.yaml");
    const yaml = `
policies:
  api_design:
    authentication:
      method: "invalid_method"
`;
    fs.writeFileSync(configPath, yaml);
    const config = loadOrgConfig(configPath);

    const result = validateOrgConfig(config);
    assert.equal(result.valid, false);
    assert(result.errors?.some((e) => e.includes("method")));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("OrgConfig Validator: validateOrgConfigStrict should throw on invalid config", () => {
  const tempDir = fs.mkdtempSync("validator-test-");
  try {
    const configPath = path.join(tempDir, "invalid-strict.yaml");
    const yaml = `
policies:
  testing:
    minimum_coverage: 150
`;
    fs.writeFileSync(configPath, yaml);
    const config = loadOrgConfig(configPath);

    assert.throws(() => validateOrgConfigStrict(config));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
