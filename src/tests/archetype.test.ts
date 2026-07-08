import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getArchetype, listArchetypes } from "../archetypes/registry.js";
import { scanProjectSignals } from "../archetypes/scanner.js";
import { mapArtifact } from "../archetypes/mapper.js";
import { writeArchetypeFiles } from "../archetypes/writer.js";

const execFileAsync = promisify(execFile);

// ── Registry ──────────────────────────────────────────────────────────────────

test("listArchetypes returns 5 archetypes", () => {
  const archetypes = listArchetypes();
  assert.equal(archetypes.length, 5);
  const names = archetypes.map((a) => a.name);
  assert.ok(names.includes("sdlc"));
  assert.ok(names.includes("sdlc-java-spring"));
  assert.ok(names.includes("sdlc-dotnet"));
  assert.ok(names.includes("sdlc-python-flask"));
  assert.ok(names.includes("sdlc-python-fastapi"));
});

test("getArchetype returns manifest for sdlc", () => {
  const manifest = getArchetype("sdlc");
  assert.ok(manifest);
  assert.equal(manifest.name, "sdlc");
  assert.ok(manifest.templates.some((t) => t.family === "agents" && t.slug === "sdlc-orchestrator"));
  assert.ok(manifest.templates.some((t) => t.family === "rules" && t.slug === "sdlc-pipeline"));
  assert.ok(manifest.templates.some((t) => t.family === "instructions" && t.slug === "instructions"));
  assert.ok(manifest.templates.some((t) => t.family === "commands" && t.slug === "full-sdlc"));
  assert.ok(manifest.templates.some((t) => t.family === "skills" && t.slug === "e2e-sdlc-workflow"));
});

test("getArchetype returns undefined for unknown name", () => {
  assert.equal(getArchetype("nonexistent"), undefined);
});

test("sdlc-java-spring includes java-spring-stack rule and all sdlc templates", () => {
  const manifest = getArchetype("sdlc-java-spring");
  assert.ok(manifest);
  assert.ok(manifest.templates.some((t) => t.slug === "java-spring-stack" && t.family === "rules"));
  assert.ok(manifest.templates.some((t) => t.slug === "sdlc-orchestrator"));
  assert.equal(manifest.stackLabel, "Java / Spring Boot");
});

test("sdlc-python-flask includes python-flask-stack rule", () => {
  const manifest = getArchetype("sdlc-python-flask");
  assert.ok(manifest);
  assert.ok(manifest.templates.some((t) => t.slug === "python-flask-stack" && t.family === "rules"));
  assert.equal(manifest.stackLabel, "Python / Flask");
});

test("each archetype template has a non-empty templatePath", () => {
  for (const archetype of listArchetypes()) {
    for (const template of archetype.templates) {
      assert.ok(
        template.templatePath.length > 0,
        `${archetype.name}/${template.slug} has empty templatePath`
      );
    }
  }
});

// ── Scanner ───────────────────────────────────────────────────────────────────

test("scanProjectSignals detects npm project name and commands", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "my-app" }));
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, "my-app");
    assert.equal(signals.testCommand, "npm test");
    assert.equal(signals.buildCommand, "npm run build");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals detects maven artifactId and commands", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    fs.writeFileSync(
      path.join(dir, "pom.xml"),
      "<project><groupId>com.example</groupId><artifactId>my-service</artifactId></project>"
    );
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, "my-service");
    assert.equal(signals.testCommand, "./mvnw test");
    assert.equal(signals.buildCommand, "./mvnw package -DskipTests");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals detects pyproject.toml project name", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    fs.writeFileSync(path.join(dir, "pyproject.toml"), '[project]\nname = "my-api"\nversion = "0.1.0"\n');
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, "my-api");
    assert.equal(signals.testCommand, "python -m pytest");
    assert.equal(signals.buildCommand, "python -m build");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals detects requirements.txt as Python fallback", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    fs.writeFileSync(path.join(dir, "requirements.txt"), "flask\npytest\n");
    const signals = scanProjectSignals(dir);
    assert.equal(signals.testCommand, "python -m pytest");
    assert.equal(signals.buildCommand, "python -m build");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals detects csproj project name and commands", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    fs.writeFileSync(path.join(dir, "MyApp.csproj"), '<Project Sdk="Microsoft.NET.Sdk"></Project>');
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, "MyApp");
    assert.equal(signals.testCommand, "dotnet test");
    assert.equal(signals.buildCommand, "dotnet build");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals falls back to directory basename when no known files found", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-scan-"));
  try {
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, path.basename(dir));
    assert.match(signals.testCommand, /TODO/);
    assert.match(signals.buildCommand, /TODO/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

// ── Mapper ────────────────────────────────────────────────────────────────────

test("mapArtifact: claude instructions → CLAUDE.md", () => {
  const result = mapArtifact("instructions", "instructions", "claude");
  assert.equal(result.relativePath, "CLAUDE.md");
  assert.equal(result.frontmatterOverride, undefined);
});

test("mapArtifact: copilot instructions → AGENTS.md", () => {
  assert.equal(mapArtifact("instructions", "instructions", "copilot").relativePath, "AGENTS.md");
});

test("mapArtifact: cursor instructions → AGENTS.md", () => {
  assert.equal(mapArtifact("instructions", "instructions", "cursor").relativePath, "AGENTS.md");
});

test("mapArtifact: claude rules → .claude/rules/<slug>.md with paths frontmatter", () => {
  const result = mapArtifact("rules", "sdlc-pipeline", "claude");
  assert.equal(result.relativePath, ".claude/rules/sdlc-pipeline.md");
  assert.deepEqual(result.frontmatterOverride, { paths: ["**"] });
});

test("mapArtifact: copilot rules → .github/instructions/<slug>.instructions.md with applyTo", () => {
  const result = mapArtifact("rules", "sdlc-pipeline", "copilot");
  assert.equal(result.relativePath, ".github/instructions/sdlc-pipeline.instructions.md");
  assert.deepEqual(result.frontmatterOverride, { applyTo: "**" });
});

test("mapArtifact: cursor rules → .cursor/rules/<slug>.mdc with globs frontmatter", () => {
  const result = mapArtifact("rules", "sdlc-pipeline", "cursor");
  assert.equal(result.relativePath, ".cursor/rules/sdlc-pipeline.mdc");
  assert.ok(result.frontmatterOverride);
  assert.deepEqual(result.frontmatterOverride["globs"], ["**/*"]);
  assert.equal(result.frontmatterOverride["alwaysApply"], true);
});

test("mapArtifact: claude agents → .claude/agents/<slug>.agent.md", () => {
  assert.equal(
    mapArtifact("agents", "sdlc-orchestrator", "claude").relativePath,
    ".claude/agents/sdlc-orchestrator.agent.md"
  );
});

test("mapArtifact: copilot agents → .github/agents/<slug>.agent.md", () => {
  assert.equal(
    mapArtifact("agents", "requirements-analyst", "copilot").relativePath,
    ".github/agents/requirements-analyst.agent.md"
  );
});

test("mapArtifact: cursor agents → .cursor/agents/<slug>.agent.md", () => {
  assert.equal(
    mapArtifact("agents", "requirements-analyst", "cursor").relativePath,
    ".cursor/agents/requirements-analyst.agent.md"
  );
});

test("mapArtifact: claude skills → .claude/skills/<slug>/SKILL.md", () => {
  assert.equal(
    mapArtifact("skills", "e2e-sdlc-workflow", "claude").relativePath,
    ".claude/skills/e2e-sdlc-workflow/SKILL.md"
  );
});

test("mapArtifact: copilot skills → .github/skills/<slug>/SKILL.md", () => {
  assert.equal(
    mapArtifact("skills", "e2e-sdlc-workflow", "copilot").relativePath,
    ".github/skills/e2e-sdlc-workflow/SKILL.md"
  );
});

test("mapArtifact: cursor skills → .cursor/skills/<slug>/SKILL.md", () => {
  assert.equal(
    mapArtifact("skills", "e2e-sdlc-workflow", "cursor").relativePath,
    ".cursor/skills/e2e-sdlc-workflow/SKILL.md"
  );
});

test("mapArtifact: claude commands → .claude/commands/<slug>.md", () => {
  assert.equal(
    mapArtifact("commands", "full-sdlc", "claude").relativePath,
    ".claude/commands/full-sdlc.md"
  );
});

test("mapArtifact: copilot commands → .github/prompts/<slug>.prompt.md", () => {
  assert.equal(
    mapArtifact("commands", "full-sdlc", "copilot").relativePath,
    ".github/prompts/full-sdlc.prompt.md"
  );
});

test("mapArtifact: cursor commands → .cursor/commands/<slug>.md", () => {
  assert.equal(
    mapArtifact("commands", "full-sdlc", "cursor").relativePath,
    ".cursor/commands/full-sdlc.md"
  );
});

// ── Writer ────────────────────────────────────────────────────────────────────

test("writeArchetypeFiles dry-run returns planned paths without writing files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "test-project", testCommand: "npm test", buildCommand: "npm run build" };
    const results = writeArchetypeFiles(manifest, dir, "claude", signals, true, false);
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => !r.skipped));
    assert.ok(!fs.existsSync(path.join(dir, "CLAUDE.md")));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles writes files and substitutes {{project_name}}", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "my-api", testCommand: "npm test", buildCommand: "npm run build" };
    writeArchetypeFiles(manifest, dir, "claude", signals, false, false);
    const claudeMd = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
    assert.ok(claudeMd.includes("my-api"), "CLAUDE.md should contain substituted project name");
    assert.ok(!claudeMd.includes("{{project_name}}"), "CLAUDE.md should not contain raw placeholder");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles skips existing files without --force", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "original content");
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "test", testCommand: "npm test", buildCommand: "npm run build" };
    const results = writeArchetypeFiles(manifest, dir, "claude", signals, false, false);
    assert.ok(results.some((r) => r.relativePath === "CLAUDE.md" && r.skipped));
    assert.equal(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8"), "original content");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles overwrites existing files with --force", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    fs.writeFileSync(path.join(dir, "CLAUDE.md"), "old content");
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "test", testCommand: "npm test", buildCommand: "npm run build" };
    writeArchetypeFiles(manifest, dir, "claude", signals, false, true);
    assert.notEqual(fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8"), "old content");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles applies copilot target path mapping", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "test", testCommand: "npm test", buildCommand: "npm run build" };
    writeArchetypeFiles(manifest, dir, "copilot", signals, false, false);
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github", "instructions", "sdlc-pipeline.instructions.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github", "prompts", "full-sdlc.prompt.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github", "agents", "sdlc-orchestrator.agent.md")));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles adapts rule frontmatter for copilot target", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals = { projectName: "test", testCommand: "npm test", buildCommand: "npm run build" };
    writeArchetypeFiles(manifest, dir, "copilot", signals, false, false);
    const rule = fs.readFileSync(
      path.join(dir, ".github", "instructions", "sdlc-pipeline.instructions.md"),
      "utf8"
    );
    assert.ok(rule.includes('applyTo: "**"'), "copilot rule should have applyTo frontmatter");
    assert.ok(!rule.includes("paths:"), "copilot rule should not have claude paths frontmatter");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles substitutes {{test_command}} in stack rule", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc-java-spring")!;
    const signals = {
      projectName: "my-service",
      testCommand: "./mvnw test",
      buildCommand: "./mvnw package -DskipTests"
    };
    writeArchetypeFiles(manifest, dir, "claude", signals, false, false);
    const stackRule = fs.readFileSync(path.join(dir, ".claude", "rules", "java-spring-stack.md"), "utf8");
    assert.ok(stackRule.includes("./mvnw test"), "stack rule should have substituted test command");
    assert.ok(!stackRule.includes("{{test_command}}"), "stack rule should not have raw placeholder");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

// ── CLI integration ───────────────────────────────────────────────────────────

test("cli: archetype --list prints all 5 archetypes", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/index.js",
    "archetype",
    "--list"
  ], { cwd: process.cwd() });
  assert.match(stdout, /sdlc\b/);
  assert.match(stdout, /sdlc-java-spring/);
  assert.match(stdout, /sdlc-dotnet/);
  assert.match(stdout, /sdlc-python-flask/);
  assert.match(stdout, /sdlc-python-fastapi/);
});

test("cli: archetype --dry-run prints paths and writes no files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cli-"));
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      "dist/index.js",
      "archetype",
      "--name", "sdlc",
      "--target", "claude",
      "--project", dir,
      "--dry-run"
    ], { cwd: process.cwd() });
    assert.match(stdout, /CLAUDE\.md/);
    assert.match(stdout, /sdlc-orchestrator/);
    assert.ok(!fs.existsSync(path.join(dir, "CLAUDE.md")));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("cli: archetype writes files for claude target", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-cli-"));
  try {
    await execFileAsync(process.execPath, [
      "dist/index.js",
      "archetype",
      "--name", "sdlc",
      "--target", "claude",
      "--project", dir
    ], { cwd: process.cwd() });
    assert.ok(fs.existsSync(path.join(dir, "CLAUDE.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude", "rules", "sdlc-pipeline.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude", "agents", "sdlc-orchestrator.agent.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude", "skills", "e2e-sdlc-workflow", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude", "commands", "full-sdlc.md")));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("cli: archetype exits with error for unknown archetype name", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [
      "dist/index.js",
      "archetype",
      "--name", "nonexistent",
      "--target", "claude"
    ], { cwd: process.cwd() }),
    /nonexistent/
  );
});

test("cli: archetype exits with error for unsupported target", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [
      "dist/index.js",
      "archetype",
      "--name", "sdlc",
      "--target", "codex"
    ], { cwd: process.cwd() }),
    /codex/
  );
});
