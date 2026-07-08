# Archetype Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `harness-gen archetype` subcommand that scaffolds a complete SDLC workflow pipeline (skills, agents, rules, commands, instructions) into a target project from pre-authored templates with lite auto-customization.

**Architecture:** Static `.md` template files live in `archetypes/` at the package root and are read at runtime via `fs.readFileSync`. A registry maps archetype names to template file refs. A mapper translates each family+slug pair to a target-tool-specific output path. A scanner does a lightweight read of the target project to substitute `{{placeholders}}` before writing.

**Tech Stack:** TypeScript (ESM, NodeNext), Node.js 22+, `commander` for CLI, `@clack/prompts` for UI. No new dependencies.

## Global Constraints

- Node.js ≥ 22.0.0
- `"type": "module"` — all imports use `.js` extensions, `import.meta.url` for path resolution
- Build command is `npm run build` (just `tsc`) — no new build steps needed; `archetypes/` is read from package root at runtime, not compiled
- Test runner: `npm test` → `node --test dist/tests/*.test.js`
- Supported targets for `archetype` subcommand: `claude`, `copilot`, `cursor` only (not `codex`)
- No LLM calls in the archetype path — purely file I/O
- Existing files skipped by default; `--force` overwrites
- All new source modules go in `src/archetypes/`
- Template files go in `archetypes/` at project root (sibling of `src/`, `dist/`)

---

## File Map

**Created:**
- `archetypes/sdlc/instructions.md` — CLAUDE.md/AGENTS.md template with placeholders
- `archetypes/sdlc/rules/sdlc-pipeline.md` — copied from `.claude/rules/sdlc-pipeline.md`
- `archetypes/sdlc/agents/sdlc-orchestrator.agent.md` — copied from `.claude/agents/`
- `archetypes/sdlc/agents/requirements-analyst.agent.md`
- `archetypes/sdlc/agents/implementation-planner.agent.md`
- `archetypes/sdlc/agents/implementation-executor.agent.md`
- `archetypes/sdlc/agents/plan-reviewer.agent.md`
- `archetypes/sdlc/agents/team-reviewer.agent.md`
- `archetypes/sdlc/skills/e2e-sdlc-workflow/SKILL.md` — copied from `.claude/skills/`
- `archetypes/sdlc/skills/feature-specification/SKILL.md`
- `archetypes/sdlc/skills/implementation-plan/SKILL.md`
- `archetypes/sdlc/skills/implementation-report/SKILL.md`
- `archetypes/sdlc/skills/review-report/SKILL.md`
- `archetypes/sdlc/skills/change-scope-control/SKILL.md`
- `archetypes/sdlc/skills/test-strategy/SKILL.md`
- `archetypes/sdlc/skills/pr-description/SKILL.md`
- `archetypes/sdlc/commands/full-sdlc.md` — copied from `.claude/commands/`
- `archetypes/sdlc/commands/specification.md`
- `archetypes/sdlc/commands/implementation-plan.md`
- `archetypes/sdlc/commands/implementation.md`
- `archetypes/sdlc/commands/review.md`
- `archetypes/sdlc/commands/ship-summary.md`
- `archetypes/stacks/java-spring.md` — new hand-authored stack rule
- `archetypes/stacks/dotnet.md`
- `archetypes/stacks/python-flask.md`
- `archetypes/stacks/python-fastapi.md`
- `src/archetypes/registry.ts` — archetype manifests + lookup
- `src/archetypes/mapper.ts` — target-aware path + frontmatter mapping
- `src/archetypes/scanner.ts` — lite project scan for placeholder values
- `src/archetypes/writer.ts` — template loading, substitution, file writing
- `src/archetypes/command.ts` — Commander subcommand wiring
- `src/tests/archetype.test.ts` — unit + integration tests

**Modified:**
- `src/types.ts` — add `"commands"` to `ArtifactFamily`
- `src/index.ts` — register `archetype` subcommand

---

## Task 1: Create archetype template files

**Files:**
- Create: `archetypes/sdlc/instructions.md`
- Create: `archetypes/sdlc/rules/sdlc-pipeline.md`
- Create: `archetypes/sdlc/agents/*.agent.md` (6 files)
- Create: `archetypes/sdlc/skills/*/SKILL.md` (8 files)
- Create: `archetypes/sdlc/commands/*.md` (6 files)
- Create: `archetypes/stacks/*.md` (4 files)

**Interfaces:**
- Produces: `archetypes/` directory read by `writer.ts` via `fs.readFileSync`
- Placeholders used: `{{project_name}}`, `{{stack_label}}`, `{{test_command}}`, `{{build_command}}`
- Only `instructions.md` and stack rule files use placeholders; all other files are copied verbatim

- [ ] **Step 1: Create the archetypes directory structure**

```bash
mkdir -p archetypes/sdlc/rules
mkdir -p archetypes/sdlc/agents
mkdir -p archetypes/sdlc/skills/e2e-sdlc-workflow
mkdir -p archetypes/sdlc/skills/feature-specification
mkdir -p archetypes/sdlc/skills/implementation-plan
mkdir -p archetypes/sdlc/skills/implementation-report
mkdir -p archetypes/sdlc/skills/review-report
mkdir -p archetypes/sdlc/skills/change-scope-control
mkdir -p archetypes/sdlc/skills/test-strategy
mkdir -p archetypes/sdlc/skills/pr-description
mkdir -p archetypes/sdlc/commands
mkdir -p archetypes/stacks
```

- [ ] **Step 2: Create `archetypes/sdlc/instructions.md`**

```markdown
# {{project_name}}

This project uses the SDLC workflow pipeline. The pipeline runs an
autonomous sequence through specification, planning, implementation,
and review.

## Stack

**{{stack_label}}**
Build: `{{build_command}}`
Test: `{{test_command}}`

## Quick start

Run the full pipeline end to end:

```
/full-sdlc <your feature request>
```

Run individual stages:

```
/specification        — produce a feature specification
/implementation-plan  — produce an implementation plan
/implementation       — execute an approved plan
/review               — review implementation against spec and plan
```

## Agents

- **sdlc-orchestrator** — primary entrypoint for end-to-end workflows
- **requirements-analyst** — converts feature requests into specifications
- **implementation-planner** — turns specifications into implementation plans
- **implementation-executor** — executes approved implementation plans
- **plan-reviewer** — reviews implementation against spec and plan
- **team-reviewer** — general code quality review

## Stage gate rules

1. Do not begin implementation until an `implementation-plan` exists.
2. Do not silently expand scope beyond the approved `specification` and `implementation-plan`.
3. Do not declare work complete until review has been run against both the `specification` and the `implementation-plan`.
```

- [ ] **Step 3: Copy rule, agent, skill, and command files verbatim**

Copy each file from `.claude/` to the corresponding `archetypes/sdlc/` path:

```bash
cp .claude/rules/sdlc-pipeline.md archetypes/sdlc/rules/sdlc-pipeline.md
cp .claude/agents/sdlc-orchestrator.agent.md archetypes/sdlc/agents/
cp .claude/agents/requirements-analyst.agent.md archetypes/sdlc/agents/
cp .claude/agents/implementation-planner.agent.md archetypes/sdlc/agents/
cp .claude/agents/implementation-executor.agent.md archetypes/sdlc/agents/
cp .claude/agents/plan-reviewer.agent.md archetypes/sdlc/agents/
cp .claude/agents/team-reviewer.agent.md archetypes/sdlc/agents/
cp .claude/skills/e2e-sdlc-workflow/SKILL.md archetypes/sdlc/skills/e2e-sdlc-workflow/
cp .claude/skills/feature-specification/SKILL.md archetypes/sdlc/skills/feature-specification/
cp .claude/skills/implementation-plan/SKILL.md archetypes/sdlc/skills/implementation-plan/
cp .claude/skills/implementation-report/SKILL.md archetypes/sdlc/skills/implementation-report/
cp .claude/skills/review-report/SKILL.md archetypes/sdlc/skills/review-report/
cp .claude/skills/change-scope-control/SKILL.md archetypes/sdlc/skills/change-scope-control/
cp .claude/skills/test-strategy/SKILL.md archetypes/sdlc/skills/test-strategy/
cp .claude/skills/pr-description/SKILL.md archetypes/sdlc/skills/pr-description/
cp .claude/commands/full-sdlc.md archetypes/sdlc/commands/
cp .claude/commands/specification.md archetypes/sdlc/commands/
cp .claude/commands/implementation-plan.md archetypes/sdlc/commands/
cp .claude/commands/implementation.md archetypes/sdlc/commands/
cp .claude/commands/review.md archetypes/sdlc/commands/
cp .claude/commands/ship-summary.md archetypes/sdlc/commands/
```

- [ ] **Step 4: Create `archetypes/stacks/java-spring.md`**

```markdown
---
paths:
  - "**"
---

# Java / Spring Boot Stack Rules

## Build and test commands

Build: `{{build_command}}`
Test: `{{test_command}}`
Single test: `./mvnw test -Dtest=ClassName#methodName`

## Conventions

- Use Spring Boot annotations: `@RestController`, `@Service`, `@Repository`, `@Component`
- Use constructor injection — not field injection with `@Autowired`
- Mark service methods that modify state with `@Transactional`
- Use DTOs for request/response bodies; keep entity classes for persistence only
- Validate request bodies with `@Valid` and Bean Validation annotations
- Handle exceptions globally with `@ControllerAdvice` and `@ExceptionHandler`

## Guardrails

- Do not use `@Autowired` field injection
- Do not expose JPA entity classes directly in API responses
- Do not catch and swallow exceptions without logging or rethrowing
- Do not use raw generic types
```

- [ ] **Step 5: Create `archetypes/stacks/dotnet.md`**

```markdown
---
paths:
  - "**"
---

# .NET Stack Rules

## Build and test commands

Build: `{{build_command}}`
Test: `{{test_command}}`
Single test: `dotnet test --filter "FullyQualifiedName~TestName"`

## Conventions

- Use `async`/`await` consistently on all I/O-bound operations
- Inject dependencies through the built-in DI container via constructors
- Use `record` types for DTOs and value objects
- Bind configuration with `IOptions<T>` — no direct `ConfigurationManager` reads
- Use minimal API or controller-based routing consistently within a project

## Guardrails

- Never call `.Result` or `.Wait()` on async methods — deadlock risk
- Do not return domain entities directly from API controllers
- Do not store mutable state in `static` fields for per-request data
```

- [ ] **Step 6: Create `archetypes/stacks/python-flask.md`**

```markdown
---
paths:
  - "**"
---

# Python / Flask Stack Rules

## Build and test commands

Test: `{{test_command}}`
Single test: `python -m pytest tests/path/test_file.py::test_name -v`
Coverage: `python -m pytest --cov`

## Conventions

- Use the application factory pattern (`create_app()`) for Flask initialization
- Organize routes into Blueprints by domain
- Use Flask-SQLAlchemy for database access — no raw SQL strings
- Load configuration from environment variables via `python-dotenv`
- Return JSON responses using `flask.jsonify()` or `flask.Response`

## Guardrails

- Do not import the `app` object directly inside blueprints — use `current_app` proxy
- Do not store mutable state at module level
- Do not use bare `assert` for validation — use explicit checks with `flask.abort()`
```

- [ ] **Step 7: Create `archetypes/stacks/python-fastapi.md`**

```markdown
---
paths:
  - "**"
---

# Python / FastAPI Stack Rules

## Build and test commands

Test: `{{test_command}}`
Single test: `python -m pytest tests/path/test_file.py::test_name -v`
Coverage: `python -m pytest --cov`

## Conventions

- Use Pydantic models for all request and response bodies
- Use `Depends()` for dependency injection
- Organize routes in separate router modules and mount with `app.include_router()`
- Use `async def` for I/O-bound route handlers
- Use the `lifespan` context manager for startup and shutdown events

## Guardrails

- Do not return raw `dict` from endpoints — use Pydantic response models
- Do not call synchronous blocking functions inside `async def` handlers
- Do not store mutable state at module level
```

- [ ] **Step 8: Verify all files exist**

```bash
find archetypes -type f | sort
```

Expected output (29 files):
```
archetypes/sdlc/agents/implementation-executor.agent.md
archetypes/sdlc/agents/implementation-planner.agent.md
archetypes/sdlc/agents/plan-reviewer.agent.md
archetypes/sdlc/agents/requirements-analyst.agent.md
archetypes/sdlc/agents/sdlc-orchestrator.agent.md
archetypes/sdlc/agents/team-reviewer.agent.md
archetypes/sdlc/commands/full-sdlc.md
archetypes/sdlc/commands/implementation-plan.md
archetypes/sdlc/commands/implementation.md
archetypes/sdlc/commands/review.md
archetypes/sdlc/commands/ship-summary.md
archetypes/sdlc/commands/specification.md
archetypes/sdlc/instructions.md
archetypes/sdlc/rules/sdlc-pipeline.md
archetypes/sdlc/skills/change-scope-control/SKILL.md
archetypes/sdlc/skills/e2e-sdlc-workflow/SKILL.md
archetypes/sdlc/skills/feature-specification/SKILL.md
archetypes/sdlc/skills/implementation-plan/SKILL.md
archetypes/sdlc/skills/implementation-report/SKILL.md
archetypes/sdlc/skills/pr-description/SKILL.md
archetypes/sdlc/skills/review-report/SKILL.md
archetypes/sdlc/skills/test-strategy/SKILL.md
archetypes/stacks/dotnet.md
archetypes/stacks/java-spring.md
archetypes/stacks/python-fastapi.md
archetypes/stacks/python-flask.md
```

- [ ] **Step 9: Commit template files**

```bash
git add archetypes/
git commit -m "feat: add archetype template files for sdlc and stack variants"
```

---

## Task 2: Extend `ArtifactFamily` type and implement `registry.ts`

**Files:**
- Modify: `src/types.ts`
- Create: `src/archetypes/registry.ts`
- Create: `src/tests/archetype.test.ts` (registry tests only for now)

**Interfaces:**
- `ArchetypeName` = `"sdlc" | "sdlc-java-spring" | "sdlc-dotnet" | "sdlc-python-flask" | "sdlc-python-fastapi"`
- `TemplateFamily` = `"instructions" | "rules" | "agents" | "skills" | "commands"`
- `getArchetype(name: string): ArchetypeManifest | undefined`
- `listArchetypes(): ArchetypeManifest[]`

- [ ] **Step 1: Write failing registry tests**

Create `src/tests/archetype.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { getArchetype, listArchetypes } from "../archetypes/registry.js";

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
      assert.ok(template.templatePath.length > 0, `${archetype.name}/${template.slug} has empty templatePath`);
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run build 2>&1 | tail -5
```

Expected: compile error — `../archetypes/registry.js` not found.

- [ ] **Step 3: Add `"commands"` to `ArtifactFamily` in `src/types.ts`**

Find line 1 in `src/types.ts`:
```typescript
export type ArtifactFamily = "instructions" | "rules" | "skills" | "hooks" | "agents";
```

Replace with:
```typescript
export type ArtifactFamily = "instructions" | "rules" | "skills" | "hooks" | "agents" | "commands";
```

- [ ] **Step 4: Create `src/archetypes/registry.ts`**

```typescript
export type ArchetypeName =
  | "sdlc"
  | "sdlc-java-spring"
  | "sdlc-dotnet"
  | "sdlc-python-flask"
  | "sdlc-python-fastapi";

export type TemplateFamily = "instructions" | "rules" | "agents" | "skills" | "commands";

export interface TemplateRef {
  slug: string;
  family: TemplateFamily;
  templatePath: string;
}

export interface ArchetypeManifest {
  name: ArchetypeName;
  description: string;
  stackLabel: string;
  templates: TemplateRef[];
}

const BASE_SDLC_TEMPLATES: TemplateRef[] = [
  { slug: "instructions", family: "instructions", templatePath: "sdlc/instructions.md" },
  { slug: "sdlc-pipeline", family: "rules", templatePath: "sdlc/rules/sdlc-pipeline.md" },
  { slug: "sdlc-orchestrator", family: "agents", templatePath: "sdlc/agents/sdlc-orchestrator.agent.md" },
  { slug: "requirements-analyst", family: "agents", templatePath: "sdlc/agents/requirements-analyst.agent.md" },
  { slug: "implementation-planner", family: "agents", templatePath: "sdlc/agents/implementation-planner.agent.md" },
  { slug: "implementation-executor", family: "agents", templatePath: "sdlc/agents/implementation-executor.agent.md" },
  { slug: "plan-reviewer", family: "agents", templatePath: "sdlc/agents/plan-reviewer.agent.md" },
  { slug: "team-reviewer", family: "agents", templatePath: "sdlc/agents/team-reviewer.agent.md" },
  { slug: "e2e-sdlc-workflow", family: "skills", templatePath: "sdlc/skills/e2e-sdlc-workflow/SKILL.md" },
  { slug: "feature-specification", family: "skills", templatePath: "sdlc/skills/feature-specification/SKILL.md" },
  { slug: "implementation-plan", family: "skills", templatePath: "sdlc/skills/implementation-plan/SKILL.md" },
  { slug: "implementation-report", family: "skills", templatePath: "sdlc/skills/implementation-report/SKILL.md" },
  { slug: "review-report", family: "skills", templatePath: "sdlc/skills/review-report/SKILL.md" },
  { slug: "change-scope-control", family: "skills", templatePath: "sdlc/skills/change-scope-control/SKILL.md" },
  { slug: "test-strategy", family: "skills", templatePath: "sdlc/skills/test-strategy/SKILL.md" },
  { slug: "pr-description", family: "skills", templatePath: "sdlc/skills/pr-description/SKILL.md" },
  { slug: "full-sdlc", family: "commands", templatePath: "sdlc/commands/full-sdlc.md" },
  { slug: "specification", family: "commands", templatePath: "sdlc/commands/specification.md" },
  { slug: "implementation-plan", family: "commands", templatePath: "sdlc/commands/implementation-plan.md" },
  { slug: "implementation", family: "commands", templatePath: "sdlc/commands/implementation.md" },
  { slug: "review", family: "commands", templatePath: "sdlc/commands/review.md" },
  { slug: "ship-summary", family: "commands", templatePath: "sdlc/commands/ship-summary.md" }
];

const ARCHETYPES: ArchetypeManifest[] = [
  {
    name: "sdlc",
    description: "Base SDLC workflow: spec → plan → implement → review",
    stackLabel: "General",
    templates: BASE_SDLC_TEMPLATES
  },
  {
    name: "sdlc-java-spring",
    description: "SDLC + Java/Spring Boot stack rules (Maven, Spring Boot conventions)",
    stackLabel: "Java / Spring Boot",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "java-spring-stack", family: "rules", templatePath: "stacks/java-spring.md" }
    ]
  },
  {
    name: "sdlc-dotnet",
    description: "SDLC + .NET stack rules (dotnet CLI, C# conventions)",
    stackLabel: ".NET",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "dotnet-stack", family: "rules", templatePath: "stacks/dotnet.md" }
    ]
  },
  {
    name: "sdlc-python-flask",
    description: "SDLC + Python/Flask stack rules (pytest, Flask conventions)",
    stackLabel: "Python / Flask",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "python-flask-stack", family: "rules", templatePath: "stacks/python-flask.md" }
    ]
  },
  {
    name: "sdlc-python-fastapi",
    description: "SDLC + Python/FastAPI stack rules (pytest, FastAPI conventions)",
    stackLabel: "Python / FastAPI",
    templates: [
      ...BASE_SDLC_TEMPLATES,
      { slug: "python-fastapi-stack", family: "rules", templatePath: "stacks/python-fastapi.md" }
    ]
  }
];

export function getArchetype(name: string): ArchetypeManifest | undefined {
  return ARCHETYPES.find((a) => a.name === name);
}

export function listArchetypes(): ArchetypeManifest[] {
  return ARCHETYPES;
}
```

- [ ] **Step 5: Build and run registry tests**

```bash
npm run build && node --test dist/tests/archetype.test.js 2>&1 | head -40
```

Expected: all 6 registry tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/archetypes/registry.ts src/tests/archetype.test.ts
git commit -m "feat: add archetype registry and extend ArtifactFamily type"
```

---

## Task 3: Implement `scanner.ts`

**Files:**
- Create: `src/archetypes/scanner.ts`
- Modify: `src/tests/archetype.test.ts` (append scanner tests)

**Interfaces:**
- Produces: `scanProjectSignals(projectRoot: string): ProjectSignals`
- `ProjectSignals = { projectName: string; testCommand: string; buildCommand: string }`

- [ ] **Step 1: Append scanner tests to `src/tests/archetype.test.ts`**

```typescript
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { scanProjectSignals } from "../archetypes/scanner.js";

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
    fs.writeFileSync(path.join(dir, "MyApp.csproj"), "<Project Sdk=\"Microsoft.NET.Sdk\"></Project>");
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, "MyApp");
    assert.equal(signals.testCommand, "dotnet test");
    assert.equal(signals.buildCommand, "dotnet build");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("scanProjectSignals falls back to directory basename when no known files found", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "my-project-"));
  try {
    const signals = scanProjectSignals(dir);
    assert.equal(signals.projectName, path.basename(dir));
    assert.match(signals.testCommand, /TODO/);
    assert.match(signals.buildCommand, /TODO/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
```

- [ ] **Step 2: Build and confirm scanner tests fail**

```bash
npm run build 2>&1 | grep "scanner"
```

Expected: compile error — `../archetypes/scanner.js` not found.

- [ ] **Step 3: Create `src/archetypes/scanner.ts`**

```typescript
import fs from "node:fs";
import path from "node:path";

export interface ProjectSignals {
  projectName: string;
  testCommand: string;
  buildCommand: string;
}

const TODO_NAME = "# TODO: replace with your project name";
const TODO_TEST = "# TODO: replace with your test command";
const TODO_BUILD = "# TODO: replace with your build command";

export function scanProjectSignals(projectRoot: string): ProjectSignals {
  const pomPath = path.join(projectRoot, "pom.xml");
  if (fs.existsSync(pomPath)) {
    const pom = fs.readFileSync(pomPath, "utf8");
    const match = pom.match(/<artifactId>([^<]+)<\/artifactId>/);
    return {
      projectName: match?.[1] ?? TODO_NAME,
      testCommand: "./mvnw test",
      buildCommand: "./mvnw package -DskipTests"
    };
  }

  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: unknown };
      return {
        projectName: typeof pkg.name === "string" ? pkg.name : TODO_NAME,
        testCommand: "npm test",
        buildCommand: "npm run build"
      };
    } catch {
      // fall through to next detector
    }
  }

  const pyprojectPath = path.join(projectRoot, "pyproject.toml");
  if (fs.existsSync(pyprojectPath)) {
    const toml = fs.readFileSync(pyprojectPath, "utf8");
    const match = toml.match(/^\s*name\s*=\s*"([^"]+)"/m);
    return {
      projectName: match?.[1] ?? TODO_NAME,
      testCommand: "python -m pytest",
      buildCommand: "python -m build"
    };
  }

  const requirementsPath = path.join(projectRoot, "requirements.txt");
  if (fs.existsSync(requirementsPath)) {
    return {
      projectName: path.basename(projectRoot),
      testCommand: "python -m pytest",
      buildCommand: "python -m build"
    };
  }

  const entries = fs.readdirSync(projectRoot);
  const csproj = entries.find((f) => f.endsWith(".csproj"));
  if (csproj) {
    return {
      projectName: csproj.slice(0, -".csproj".length),
      testCommand: "dotnet test",
      buildCommand: "dotnet build"
    };
  }

  return {
    projectName: path.basename(projectRoot),
    testCommand: TODO_TEST,
    buildCommand: TODO_BUILD
  };
}
```

- [ ] **Step 4: Build and run scanner tests**

```bash
npm run build && node --test dist/tests/archetype.test.js 2>&1 | grep -E "(pass|fail|ok|not ok)"
```

Expected: all scanner tests pass (6 new + 6 registry = 12 total passing).

- [ ] **Step 5: Commit**

```bash
git add src/archetypes/scanner.ts src/tests/archetype.test.ts
git commit -m "feat: add project scanner for archetype placeholder substitution"
```

---

## Task 4: Implement `mapper.ts`

**Files:**
- Create: `src/archetypes/mapper.ts`
- Modify: `src/tests/archetype.test.ts` (append mapper tests)

**Interfaces:**
- Produces: `mapArtifact(family: TemplateFamily, slug: string, target: ArchetypeTarget): MappedArtifact`
- `ArchetypeTarget = "claude" | "copilot" | "cursor"`
- `MappedArtifact = { relativePath: string; frontmatterOverride?: Record<string, unknown> }`
- `frontmatterOverride` is set only for `rules` family — it replaces the template's original frontmatter

- [ ] **Step 1: Append mapper tests to `src/tests/archetype.test.ts`**

```typescript
import { mapArtifact } from "../archetypes/mapper.js";

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
```

- [ ] **Step 2: Build and confirm mapper tests fail**

```bash
npm run build 2>&1 | grep "mapper"
```

Expected: compile error — `../archetypes/mapper.js` not found.

- [ ] **Step 3: Create `src/archetypes/mapper.ts`**

```typescript
import type { TemplateFamily } from "./registry.js";

export type ArchetypeTarget = "claude" | "copilot" | "cursor";

export interface MappedArtifact {
  relativePath: string;
  frontmatterOverride?: Record<string, unknown>;
}

export function mapArtifact(family: TemplateFamily, slug: string, target: ArchetypeTarget): MappedArtifact {
  switch (family) {
    case "instructions":
      return { relativePath: target === "claude" ? "CLAUDE.md" : "AGENTS.md" };

    case "rules": {
      const frontmatterByTarget: Record<ArchetypeTarget, Record<string, unknown>> = {
        claude: { paths: ["**"] },
        copilot: { applyTo: "**" },
        cursor: { description: slug, globs: ["**/*"], alwaysApply: true }
      };
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/rules/${slug}.md`,
        copilot: `.github/instructions/${slug}.instructions.md`,
        cursor: `.cursor/rules/${slug}.mdc`
      };
      return {
        relativePath: pathByTarget[target],
        frontmatterOverride: frontmatterByTarget[target]
      };
    }

    case "agents": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/agents/${slug}.agent.md`,
        copilot: `.github/agents/${slug}.agent.md`,
        cursor: `.cursor/agents/${slug}.agent.md`
      };
      return { relativePath: pathByTarget[target] };
    }

    case "skills": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/skills/${slug}/SKILL.md`,
        copilot: `.github/skills/${slug}/SKILL.md`,
        cursor: `.cursor/skills/${slug}/SKILL.md`
      };
      return { relativePath: pathByTarget[target] };
    }

    case "commands": {
      const pathByTarget: Record<ArchetypeTarget, string> = {
        claude: `.claude/commands/${slug}.md`,
        copilot: `.github/prompts/${slug}.prompt.md`,
        cursor: `.cursor/commands/${slug}.md`
      };
      return { relativePath: pathByTarget[target] };
    }
  }
}
```

- [ ] **Step 4: Build and run mapper tests**

```bash
npm run build && node --test dist/tests/archetype.test.js 2>&1 | grep -E "(pass|fail|ok|not ok)"
```

Expected: all mapper tests pass (15 new + 12 prior = 27 total passing).

- [ ] **Step 5: Commit**

```bash
git add src/archetypes/mapper.ts src/tests/archetype.test.ts
git commit -m "feat: add archetype target-aware path mapper"
```

---

## Task 5: Implement `writer.ts`

**Files:**
- Create: `src/archetypes/writer.ts`
- Modify: `src/tests/archetype.test.ts` (append writer tests)

**Interfaces:**
- Consumes: `ArchetypeManifest` from `registry.ts`, `ArchetypeTarget` from `mapper.ts`, `ProjectSignals` from `scanner.ts`
- Produces: `writeArchetypeFiles(manifest, projectRoot, target, signals, dryRun, force): WriteResult[]`
- `WriteResult = { relativePath: string; skipped: boolean }`

- [ ] **Step 1: Append writer tests to `src/tests/archetype.test.ts`**

```typescript
import { writeArchetypeFiles } from "../archetypes/writer.js";

test("writeArchetypeFiles dry-run returns planned paths without writing files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "test-project",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
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
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "my-api",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
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
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "test",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
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
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "test",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
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
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "test",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
    writeArchetypeFiles(manifest, dir, "copilot", signals, false, false);
    assert.ok(fs.existsSync(path.join(dir, "AGENTS.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github/instructions/sdlc-pipeline.instructions.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github/prompts/full-sdlc.prompt.md")));
    assert.ok(fs.existsSync(path.join(dir, ".github/agents/sdlc-orchestrator.agent.md")));
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("writeArchetypeFiles adapts rule frontmatter for copilot target", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-write-"));
  try {
    const manifest = getArchetype("sdlc")!;
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "test",
      testCommand: "npm test",
      buildCommand: "npm run build"
    };
    writeArchetypeFiles(manifest, dir, "copilot", signals, false, false);
    const rule = fs.readFileSync(
      path.join(dir, ".github/instructions/sdlc-pipeline.instructions.md"),
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
    const signals: import("../archetypes/scanner.js").ProjectSignals = {
      projectName: "my-service",
      testCommand: "./mvnw test",
      buildCommand: "./mvnw package -DskipTests"
    };
    writeArchetypeFiles(manifest, dir, "claude", signals, false, false);
    const stackRule = fs.readFileSync(path.join(dir, ".claude/rules/java-spring-stack.md"), "utf8");
    assert.ok(stackRule.includes("./mvnw test"), "stack rule should have substituted test command");
    assert.ok(!stackRule.includes("{{test_command}}"), "stack rule should not have raw placeholder");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
```

- [ ] **Step 2: Build and confirm writer tests fail**

```bash
npm run build 2>&1 | grep "writer"
```

Expected: compile error — `../archetypes/writer.js` not found.

- [ ] **Step 3: Create `src/archetypes/writer.ts`**

```typescript
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchetypeManifest } from "./registry.js";
import type { ArchetypeTarget } from "./mapper.js";
import { mapArtifact } from "./mapper.js";
import type { ProjectSignals } from "./scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHETYPES_DIR = path.resolve(__dirname, "../../archetypes");

export interface WriteResult {
  relativePath: string;
  skipped: boolean;
}

function applySubstitutions(content: string, signals: ProjectSignals, stackLabel: string): string {
  return content
    .replace(/\{\{project_name\}\}/g, signals.projectName)
    .replace(/\{\{test_command\}\}/g, signals.testCommand)
    .replace(/\{\{build_command\}\}/g, signals.buildCommand)
    .replace(/\{\{stack_label\}\}/g, stackLabel);
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---\n")) {
    return content;
  }
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) {
    return content;
  }
  return content.slice(end + 5);
}

function renderFrontmatter(metadata: Record<string, unknown>): string {
  const lines = ["---"];
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value as unknown[]) {
        lines.push(`  - "${String(item)}"`);
      }
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value}`);
    } else {
      lines.push(`${key}: "${String(value)}"`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

export function writeArchetypeFiles(
  manifest: ArchetypeManifest,
  projectRoot: string,
  target: ArchetypeTarget,
  signals: ProjectSignals,
  dryRun: boolean,
  force: boolean
): WriteResult[] {
  const results: WriteResult[] = [];

  for (const template of manifest.templates) {
    const templatePath = path.join(ARCHETYPES_DIR, template.templatePath);
    const rawContent = fs.readFileSync(templatePath, "utf8");
    const substituted = applySubstitutions(rawContent, signals, manifest.stackLabel);

    const mapped = mapArtifact(template.family, template.slug, target);
    const absolutePath = path.join(projectRoot, mapped.relativePath);

    if (!force && fs.existsSync(absolutePath)) {
      results.push({ relativePath: mapped.relativePath, skipped: true });
      continue;
    }

    let finalContent: string;
    if (mapped.frontmatterOverride !== undefined) {
      const body = stripFrontmatter(substituted);
      finalContent = `${renderFrontmatter(mapped.frontmatterOverride)}\n\n${body.trimStart()}`;
    } else {
      finalContent = substituted;
    }

    if (!dryRun) {
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, finalContent);
    }

    results.push({ relativePath: mapped.relativePath, skipped: false });
  }

  return results;
}
```

- [ ] **Step 4: Build and run writer tests**

```bash
npm run build && node --test dist/tests/archetype.test.js 2>&1 | grep -E "(pass|fail|ok|not ok)"
```

Expected: all writer tests pass (7 new + 27 prior = 34 total passing).

- [ ] **Step 5: Commit**

```bash
git add src/archetypes/writer.ts src/tests/archetype.test.ts
git commit -m "feat: add archetype writer with placeholder substitution and target mapping"
```

---

## Task 6: Implement `command.ts` and wire into `index.ts`

**Files:**
- Create: `src/archetypes/command.ts`
- Modify: `src/index.ts`
- Modify: `src/tests/archetype.test.ts` (append CLI integration tests)

**Interfaces:**
- Produces: `buildArchetypeCommand(): Command` — returns a Commander `Command` instance
- Consumes: `resolveTargetRoot` from `../paths.js`, all archetype modules

- [ ] **Step 1: Append CLI integration tests to `src/tests/archetype.test.ts`**

```typescript
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
    assert.ok(fs.existsSync(path.join(dir, ".claude/rules/sdlc-pipeline.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude/agents/sdlc-orchestrator.agent.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude/skills/e2e-sdlc-workflow/SKILL.md")));
    assert.ok(fs.existsSync(path.join(dir, ".claude/commands/full-sdlc.md")));
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
```

- [ ] **Step 2: Create `src/archetypes/command.ts`**

```typescript
import { Command } from "commander";
import * as p from "@clack/prompts";
import { resolveTargetRoot } from "../paths.js";
import { getArchetype, listArchetypes } from "./registry.js";
import { mapArtifact, type ArchetypeTarget } from "./mapper.js";
import { scanProjectSignals } from "./scanner.js";
import { writeArchetypeFiles } from "./writer.js";

const SUPPORTED_TARGETS = new Set<ArchetypeTarget>(["claude", "copilot", "cursor"]);

function parseArchetypeTarget(value: string): ArchetypeTarget {
  if (SUPPORTED_TARGETS.has(value as ArchetypeTarget)) {
    return value as ArchetypeTarget;
  }
  throw new Error(`Unsupported target: ${value}. Supported targets: claude, copilot, cursor`);
}

export function buildArchetypeCommand(): Command {
  const cmd = new Command("archetype");

  cmd
    .description("Scaffold an SDLC workflow archetype into a target project")
    .option("--name <archetype>", "Archetype to scaffold")
    .option("--project <path>", "Target project directory", process.cwd())
    .option("--target <tool>", "Tool target: claude, copilot, cursor", "claude")
    .option("--dry-run", "Print planned files without writing", false)
    .option("--force", "Overwrite existing files", false)
    .option("--list", "List available archetypes and exit", false)
    .action((opts: {
      name?: string;
      project: string;
      target: string;
      dryRun: boolean;
      force: boolean;
      list: boolean;
    }) => {
      if (opts.list) {
        p.intro("Available archetypes");
        const archetypes = listArchetypes();
        p.note(
          archetypes
            .map((a) => `${a.name.padEnd(26)}${a.description}`)
            .join("\n"),
          "Archetypes"
        );
        p.outro("");
        return;
      }

      if (!opts.name) {
        p.cancel("--name is required. Run with --list to see available archetypes.");
        process.exit(1);
      }

      const manifest = getArchetype(opts.name);
      if (!manifest) {
        p.cancel(`Unknown archetype: ${opts.name}. Run with --list to see available archetypes.`);
        process.exit(1);
      }

      let target: ArchetypeTarget;
      try {
        target = parseArchetypeTarget(opts.target);
      } catch (error) {
        p.cancel(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }

      const projectRoot = resolveTargetRoot(opts.project);
      p.intro(`Scaffolding ${manifest.name} → ${target}`);

      const signals = scanProjectSignals(projectRoot);
      p.note(
        [
          `Project: ${signals.projectName}`,
          `Test:    ${signals.testCommand}`,
          `Build:   ${signals.buildCommand}`
        ].join("\n"),
        "Detected"
      );

      const results = writeArchetypeFiles(manifest, projectRoot, target, signals, opts.dryRun, opts.force);

      const written = results.filter((r) => !r.skipped);
      const skipped = results.filter((r) => r.skipped);

      p.note(
        written
          .map((r) => r.relativePath)
          .sort((a, b) => a.localeCompare(b))
          .join("\n") || "(none)",
        opts.dryRun ? "Files planned" : "Files written"
      );

      if (skipped.length > 0) {
        p.note(
          skipped.map((r) => `${r.relativePath} (exists — use --force to overwrite)`).join("\n"),
          "Skipped"
        );
      }

      p.outro(opts.dryRun ? "Dry run complete." : "Archetype scaffolded.");
    });

  return cmd;
}
```

- [ ] **Step 3: Register the subcommand in `src/index.ts`**

Add import after the existing imports (around line 19):

```typescript
import { buildArchetypeCommand } from "./archetypes/command.js";
```

Add subcommand registration inside `run()` after `program.parse(process.argv)` is defined but before `program.parse`. Insert after the last `.option(...)` call and before `program.parse(process.argv)` (around line 212):

```typescript
program.addCommand(buildArchetypeCommand());
```

- [ ] **Step 4: Build**

```bash
npm run build 2>&1
```

Expected: clean compile with no errors.

- [ ] **Step 5: Smoke test the list command**

```bash
node dist/index.js archetype --list
```

Expected output contains:
```
sdlc                      Base SDLC workflow: spec → plan → implement → review
sdlc-java-spring          SDLC + Java/Spring Boot stack rules...
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all tests pass including new CLI integration tests.

- [ ] **Step 7: Commit**

```bash
git add src/archetypes/command.ts src/index.ts src/tests/archetype.test.ts
git commit -m "feat: add archetype subcommand and wire into CLI"
```

---

## Task 7: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add archetype section to README**

After the `## Core concepts` section, add:

```markdown
## Archetype scaffolding

The `archetype` subcommand bootstraps a complete SDLC workflow pipeline into a
target project without scanning source code or calling an LLM.

### List available archetypes

```bash
harness-gen archetype --list
```

### Scaffold an archetype

```bash
harness-gen archetype --name sdlc --target claude --project ./my-project
```

Preview what will be written without writing files:

```bash
harness-gen archetype --name sdlc-java-spring --target claude --project ./my-api --dry-run
```

Force overwrite of existing files:

```bash
harness-gen archetype --name sdlc --target copilot --project ./my-project --force
```

### Supported archetypes

| Name | Description |
|---|---|
| `sdlc` | Base SDLC workflow: spec → plan → implement → review |
| `sdlc-java-spring` | SDLC + Java/Spring Boot stack rules |
| `sdlc-dotnet` | SDLC + .NET stack rules |
| `sdlc-python-flask` | SDLC + Python/Flask stack rules |
| `sdlc-python-fastapi` | SDLC + Python/FastAPI stack rules |

### Supported targets

| `--target` | Instruction file | Rules | Agents | Skills | Commands |
|---|---|---|---|---|---|
| `claude` | `CLAUDE.md` | `.claude/rules/` | `.claude/agents/` | `.claude/skills/` | `.claude/commands/` |
| `copilot` | `AGENTS.md` | `.github/instructions/` | `.github/agents/` | `.github/skills/` | `.github/prompts/` |
| `cursor` | `AGENTS.md` | `.cursor/rules/` | `.cursor/agents/` | `.cursor/skills/` | `.cursor/commands/` |

### Archetype options

- `--name <archetype>` — archetype to scaffold (required)
- `--project <path>` — target project directory (default: current directory)
- `--target <tool>` — tool target: `claude`, `copilot`, `cursor` (default: `claude`)
- `--dry-run` — print planned files without writing
- `--force` — overwrite existing files
- `--list` — list available archetypes and exit

### Auto-detected values

Before writing files, the tool scans the target project for:

- **Project name** — from `package.json`, `pom.xml`, `pyproject.toml`, or `.csproj`
- **Test command** — inferred from the project type (`npm test`, `./mvnw test`, `python -m pytest`, `dotnet test`)
- **Build command** — inferred from the project type

Undetected values are replaced with `# TODO` comments in the generated files.
```

- [ ] **Step 2: Build and run full test suite one more time**

```bash
npm run build && npm test 2>&1 | tail -10
```

Expected: clean build, all tests pass.

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: add archetype subcommand documentation to README"
```

---

## Self-Review

**Spec coverage:**
- ✅ `harness-gen archetype` subcommand with `--name`, `--project`, `--target`, `--dry-run`, `--force`, `--list`
- ✅ 5 archetypes: `sdlc`, `sdlc-java-spring`, `sdlc-dotnet`, `sdlc-python-flask`, `sdlc-python-fastapi`
- ✅ Stack variants = base SDLC + one stack rule
- ✅ Target-aware path mapping: claude, copilot, cursor
- ✅ Copilot commands → `.github/prompts/`, rules → `.github/instructions/`
- ✅ Cursor mirrors claude structure under `.cursor/`
- ✅ Lite auto-customization: project name, test command, build command
- ✅ `{{stack_label}}` substitution for `instructions.md`
- ✅ Fallbacks with `# TODO` comments
- ✅ Overwrite protection + `--force`
- ✅ Dry-run mode
- ✅ `ArtifactFamily` extended with `"commands"`
- ✅ Templates as plain `.md` files at package root — no build step change

**Placeholder scan:** No TBDs, no "similar to Task N" shortcuts, all code blocks present.

**Type consistency:**
- `ArchetypeManifest.stackLabel` defined in Task 2, consumed in Task 5 `writeArchetypeFiles` call — consistent
- `ProjectSignals` defined in Task 3, consumed in Task 5 and Task 6 — consistent
- `MappedArtifact.frontmatterOverride` defined in Task 4, consumed in Task 5 — consistent
- `WriteResult` defined in Task 5, consumed in Task 6 — consistent
