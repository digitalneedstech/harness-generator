import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildClusters } from "../clustering.js";
import { MockGenerationClient } from "../llm/client.js";
import { buildArtifactRequests } from "../llm/prompts.js";
import type { FileSummary, PlannedArtifact, ScanResult } from "../types.js";
import { materializeArtifacts } from "../writers.js";

const execFileAsync = promisify(execFile);

function buildScanResult(files: FileSummary[], clusters: ScanResult["clusters"]): ScanResult {
  return {
    targetRoot: "repo",
    files,
    clusters
  };
}

test("buildClusters creates deterministic singleton clusters", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/a.ts",
      hash: "a",
      endpoints: [],
      dependencies: [],
      language: "ts"
    },
    {
      filePath: "src/b.py",
      hash: "b",
      endpoints: [],
      dependencies: [],
      language: "py"
    }
  ];

  const clusters = buildClusters(files);
  assert.equal(clusters.length, 2);
  assert.deepEqual(clusters.map((cluster) => cluster.files[0]), ["src/a.ts", "src/b.py"]);
});

test("buildArtifactRequests trims repo context by prompt limits", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/app/api/users/route.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: [
        {
          framework: "Next.js",
          routePath: "/api/users",
          httpMethod: "GET",
          signature: "Exported HTTP Handler: GET()"
        }
      ]
    }
  ];

  const scanResult = buildScanResult(files, [
    {
      name: "src-app-api-users-route",
      files: ["src/app/api/users/route.ts"],
      endpointCount: 1
    }
  ]);

  const requests = buildArtifactRequests(scanResult, ["skills", "instructions"], {
    maxFilesPerPrompt: 1,
    maxEndpointsPerPrompt: 1
  }, ["claude", "copilot"]);

  const skill = requests.find((request) => request.relativePath.endsWith("/SKILL.md"));
  const claude = requests.find((request) => request.relativePath === "CLAUDE.md");

  assert.ok(skill);
  assert.ok(claude);
  assert.match(skill.relativePath, /\.github\/skills\//);
  assert.match(claude.promptWindows[0] ?? "", /Scanned files: 1/);
});

test("buildArtifactRequests windows repository prompts across clusters", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/a.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: []
    },
    {
      filePath: "src/b.ts",
      hash: "2",
      language: "ts",
      dependencies: [],
      endpoints: []
    }
  ];

  const scanResult = buildScanResult(files, [
    {
      name: "src-a",
      files: ["src/a.ts"],
      endpointCount: 0
    },
    {
      name: "src-b",
      files: ["src/b.ts"],
      endpointCount: 0
    }
  ]);

  const requests = buildArtifactRequests(scanResult, ["instructions"], {
    maxFilesPerPrompt: 1,
    maxEndpointsPerPrompt: 1
  }, ["claude"]);

  const claude = requests.find((request) => request.relativePath === "CLAUDE.md");

  assert.ok(claude);
  assert.equal(claude.promptWindows.length, 2);
  assert.match(claude.mergeInstruction ?? "", /Merge multiple partial analyses/i);
  assert.match(claude.promptWindows[0] ?? "", /Repository window 1 of 2/);
  assert.match(claude.promptWindows[1] ?? "", /Repository window 2 of 2/);
});

test("buildArtifactRequests always includes CLAUDE.md for claude targets", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/a.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: []
    }
  ];

  const scanResult = buildScanResult(files, [
    {
      name: "src-a",
      files: ["src/a.ts"],
      endpointCount: 0
    }
  ]);

  const requests = buildArtifactRequests(scanResult, ["rules", "agents"], {
    maxFilesPerPrompt: 5,
    maxEndpointsPerPrompt: 5
  }, ["claude"]);

  assert.ok(requests.some((request) => request.relativePath === "CLAUDE.md"));
});

test("buildArtifactRequests always includes AGENTS.md for copilot cursor and codex targets", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/a.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: []
    }
  ];

  const scanResult = buildScanResult(files, [
    {
      name: "src-a",
      files: ["src/a.ts"],
      endpointCount: 0
    }
  ]);

  for (const target of ["copilot", "cursor", "codex"] as const) {
    const requests = buildArtifactRequests(scanResult, ["rules", "agents"], {
      maxFilesPerPrompt: 5,
      maxEndpointsPerPrompt: 5
    }, [target]);

    assert.ok(requests.some((request) => request.relativePath === "AGENTS.md"));
  }
});

test("buildArtifactRequests splits oversized single clusters into multiple prompt windows", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/a.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: [{ framework: "Express", routePath: "/a", httpMethod: "GET", signature: "a" }]
    },
    {
      filePath: "src/b.ts",
      hash: "2",
      language: "ts",
      dependencies: [],
      endpoints: [{ framework: "Express", routePath: "/b", httpMethod: "GET", signature: "b" }]
    }
  ];

  const scanResult = buildScanResult(files, [
    {
      name: "oversized-cluster",
      files: ["src/a.ts", "src/b.ts"],
      endpointCount: 2
    }
  ]);

  const requests = buildArtifactRequests(scanResult, ["skills"], {
    maxFilesPerPrompt: 1,
    maxEndpointsPerPrompt: 1
  }, ["copilot"]);

  const skill = requests.find((request) => request.relativePath.endsWith("/SKILL.md"));

  assert.ok(skill);
  assert.equal(skill.promptWindows.length, 2);
  assert.match(skill.promptWindows[0] ?? "", /Cluster window 1 of 2/);
  assert.match(skill.promptWindows[1] ?? "", /Cluster window 2 of 2/);
});

test("buildArtifactRequests standard bundle reduces skill and agent counts", () => {
  const files: FileSummary[] = [
    {
      filePath: "src/api/users.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: [{ framework: "Express", routePath: "/users", httpMethod: "GET", signature: "users" }]
    },
    {
      filePath: "src/api/admin.ts",
      hash: "2",
      language: "ts",
      dependencies: [],
      endpoints: [{ framework: "Express", routePath: "/admin", httpMethod: "POST", signature: "admin" }]
    },
    {
      filePath: "src/jobs/scheduler.ts",
      hash: "3",
      language: "ts",
      dependencies: [],
      endpoints: []
    },
    {
      filePath: "src/jobs/worker.ts",
      hash: "4",
      language: "ts",
      dependencies: [],
      endpoints: []
    },
    {
      filePath: "src/ui/app.ts",
      hash: "5",
      language: "ts",
      dependencies: [],
      endpoints: []
    }
  ];

  const scanResult = buildScanResult(files, [
    { name: "src-api-users", files: ["src/api/users.ts"], endpointCount: 1 },
    { name: "src-api-admin", files: ["src/api/admin.ts"], endpointCount: 1 },
    { name: "src-jobs", files: ["src/jobs/scheduler.ts", "src/jobs/worker.ts"], endpointCount: 0 },
    { name: "src-ui", files: ["src/ui/app.ts"], endpointCount: 0 }
  ]);

  const requests = buildArtifactRequests(scanResult, ["instructions", "rules", "skills", "hooks", "agents"], {
    maxFilesPerPrompt: 5,
    maxEndpointsPerPrompt: 5
  }, ["standard"]);

  const skills = requests.filter((request) => request.family === "skills");
  const copilotAgents = requests.filter((request) => request.relativePath.startsWith(".github/agents/"));
  const claudeAgents = requests.filter((request) => request.relativePath.startsWith(".claude/agents/"));
  const codexAgents = requests.filter((request) => request.relativePath.startsWith(".codex/agents/"));

  assert.equal(skills.length, 3);
  assert.equal(copilotAgents.length, 3);
  assert.equal(claudeAgents.length, 3);
  assert.equal(codexAgents.length, 3);
  assert.ok(requests.some((request) => request.relativePath === "AGENTS.md"));
  assert.ok(requests.some((request) => request.relativePath === ".cursor/rules/repository-guidance.mdc"));
  assert.ok(requests.some((request) => request.relativePath === ".claude/settings.json"));
  assert.ok(requests.some((request) => request.relativePath === ".codex/hooks.json"));
});

test("materializeArtifacts renders deterministic wrappers and validates required metadata", async () => {
  const files: FileSummary[] = [
    {
      filePath: "src/api/users.ts",
      hash: "1",
      language: "ts",
      dependencies: [],
      endpoints: [{ framework: "Express", routePath: "/users", httpMethod: "GET", signature: "users" }]
    }
  ];

  const scanResult = buildScanResult(files, [
    { name: "src-api-users", files: ["src/api/users.ts"], endpointCount: 1 }
  ]);

  const requests = buildArtifactRequests(scanResult, ["skills"], {
    maxFilesPerPrompt: 5,
    maxEndpointsPerPrompt: 5
  }, ["copilot"]);

  const generated = await materializeArtifacts("repo", requests, new MockGenerationClient(), true, scanResult);

  const skillArtifact = generated.find((artifact) => artifact.relativePath.endsWith("/SKILL.md"));

  assert.equal(generated.length, 2);
  assert.ok(generated.some((artifact) => artifact.relativePath === "AGENTS.md"));
  assert.ok(skillArtifact);
  assert.match(skillArtifact.content ?? "", /^---/);
  assert.match(skillArtifact.content ?? "", /name: "src-api-users"/);
  assert.match(skillArtifact.content ?? "", /# Overview/);

  const invalidRequest: PlannedArtifact = {
    family: "skills",
    target: "copilot",
    renderKind: "copilot-skill",
    relativePath: ".github/skills/bad-name/SKILL.md",
    promptWindows: ["synthetic"],
    slug: "bad-name",
    title: "Bad Skill",
    llmRequired: true
  };

  await assert.rejects(
    materializeArtifacts("repo", [invalidRequest], new MockGenerationClient(), true, scanResult),
    /skills require name and description metadata/
  );
});

test("cli accepts whitespace-separated outputs and explicit targets", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/index.js",
    "--target",
    process.cwd(),
    "--outputs",
    "claude skills",
    "--targets",
    "claude copilot",
    "--dry-run"
  ], {
    cwd: process.cwd()
  });

  assert.match(stdout, /Prepared \d+ artifacts/);
  assert.match(stdout, /CLAUDE\.md/);
  assert.match(stdout, /\.github\/skills\//);
});

test("cli includes AGENTS.md by default for non-claude targets even without instructions output", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "dist/index.js",
    "--target",
    process.cwd(),
    "--targets",
    "copilot",
    "--outputs",
    "skills,rules,hooks,agents",
    "--dry-run"
  ], {
    cwd: process.cwd()
  });

  assert.match(stdout, /AGENTS\.md/);
});

test("repo root launcher supports node index.js", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    "index.js",
    "--target",
    process.cwd(),
    "--targets",
    "copilot",
    "--outputs",
    "skills,rules,hooks,agents",
    "--dry-run"
  ], {
    cwd: process.cwd()
  });

  assert.match(stdout, /Prepared \d+ artifacts/);
  assert.match(stdout, /\.github\/hooks\/validate-generated-changes\.json/);
});