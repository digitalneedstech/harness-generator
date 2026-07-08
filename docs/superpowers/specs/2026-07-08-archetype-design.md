# Archetype Feature Design

**Date:** 2026-07-08
**Status:** Approved

## Overview

Add an `archetype` subcommand to `harness-gen` that scaffolds a complete set of AI agent workflow files into a target project. An archetype is a named, opinionated collection of skills, agents, rules, commands, and a root instruction file that together form an autonomous SDLC pipeline. Users pick one archetype at a time and one tool target at a time.

## Problem

The existing `harness-gen` command generates agent guidance by scanning a repository and using an LLM to produce artifact bodies. This is the right model for repository-specific guidance (rules, agents scoped to clusters). But it does not address a different need: bootstrapping a complete workflow pipeline (spec → plan → implement → review) into a project that does not yet have one. That bootstrapping is archetype-shaped — it is a known, pre-tested set of files dropped into a project, not something that needs LLM synthesis.

## CLI Interface

New subcommand added to the existing Commander program:

```bash
harness-gen archetype --name sdlc --target claude --project ./my-project
harness-gen archetype --name sdlc-java-spring --target claude --project ./my-api --dry-run
harness-gen archetype --list
```

### Options

| Flag | Description | Default |
|---|---|---|
| `--name <archetype>` | Archetype to scaffold | required |
| `--project <path>` | Target project directory | `cwd` |
| `--target <tool>` | Tool target: `claude`, `copilot`, `cursor` | `claude` |
| `--dry-run` | Print planned files without writing | `false` |
| `--force` | Overwrite existing files | `false` |
| `--list` | Print available archetypes and exit | — |

One tool target at a time. No comma-separated lists.

## Supported Archetypes

| Name | Description |
|---|---|
| `sdlc` | Base SDLC workflow: spec → plan → implement → review |
| `sdlc-java-spring` | SDLC + Java/Spring Boot stack rule (Maven, Spring Boot conventions) |
| `sdlc-dotnet` | SDLC + .NET stack rule (dotnet CLI, C# conventions) |
| `sdlc-python-flask` | SDLC + Python/Flask stack rule (pytest, Flask conventions) |
| `sdlc-python-fastapi` | SDLC + Python/FastAPI stack rule (pytest, FastAPI conventions) |

Stack variants are the base `sdlc` archetype plus one additional stack rule file. All other artifact families (agents, skills, commands, instructions) are identical across variants.

## Artifact Families

Each archetype scaffolds these families:

| Family | Contents |
|---|---|
| instructions | `CLAUDE.md` or `AGENTS.md` describing the pipeline setup |
| rules | `sdlc-pipeline.md` + optional stack rule |
| agents | `sdlc-orchestrator`, `requirements-analyst`, `implementation-planner`, `implementation-executor`, `plan-reviewer`, `team-reviewer` |
| skills | `e2e-sdlc-workflow`, `feature-specification`, `implementation-plan`, `implementation-report`, `review-report`, `change-scope-control`, `test-strategy`, `pr-description` |
| commands | `full-sdlc`, `specification`, `implementation-plan`, `implementation`, `review`, `ship-summary` |

## Target-Aware Path Mapping

| Family | `claude` | `copilot` | `cursor` |
|---|---|---|---|
| instructions | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| rules | `.claude/rules/*.md` | `.github/instructions/*.instructions.md` | `.cursor/rules/*.mdc` |
| agents | `.claude/agents/*.agent.md` | `.github/agents/*.agent.md` | `.cursor/agents/*.agent.md` |
| skills | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | `.cursor/skills/*/SKILL.md` |
| commands | `.claude/commands/*.md` | `.github/prompts/*.prompt.md` | `.cursor/commands/*.md` |

Cursor uses the same directory structure and file conventions as Claude, under `.cursor/` instead of `.claude/`.

## Template Storage

Templates are plain `.md` files stored in an `archetypes/` directory at the package root. They are read at runtime using `fs.readFileSync` with paths resolved relative to `import.meta.url`. No compilation of template content. No extra build step.

```
archetypes/
  sdlc/
    instructions.md
    rules/
      sdlc-pipeline.md
    agents/
      sdlc-orchestrator.agent.md
      requirements-analyst.agent.md
      implementation-planner.agent.md
      implementation-executor.agent.md
      plan-reviewer.agent.md
      team-reviewer.agent.md
    skills/
      e2e-sdlc-workflow/SKILL.md
      feature-specification/SKILL.md
      implementation-plan/SKILL.md
      implementation-report/SKILL.md
      review-report/SKILL.md
      change-scope-control/SKILL.md
      test-strategy/SKILL.md
      pr-description/SKILL.md
    commands/
      full-sdlc.md
      specification.md
      implementation-plan.md
      implementation.md
      review.md
      ship-summary.md
  stacks/
    java-spring.md
    dotnet.md
    python-flask.md
    python-fastapi.md
```

Initial content for `archetypes/sdlc/` is taken verbatim from the existing `.claude/` files in harness-gen. Stack rule files under `archetypes/stacks/` are new, hand-authored files.

Template files use `{{placeholders}}` for the three values that auto-customization fills in.

## Lite Auto-Customization

Before writing files, the `archetype` command scans the target project to detect and substitute three values:

| Placeholder | Detection source | Fallback |
|---|---|---|
| `{{project_name}}` | `package.json` → `name`, `pom.xml` → `<artifactId>`, `pyproject.toml` → `[project] name`, `*.csproj` → filename | `# TODO: replace with your project name` |
| `{{test_command}}` | `pom.xml` → `./mvnw test`, `package.json` → `npm test`, `pyproject.toml`/`requirements.txt` → `python -m pytest`, `*.csproj` → `dotnet test` | `# TODO: replace with your test command` |
| `{{build_command}}` | Same files, build variant | `# TODO: replace with your build command` |

Framework detection uses harness-gen's existing parsers (Spring Boot, FastAPI, Flask, Express, Next.js). If the archetype name already specifies the stack (e.g. `sdlc-java-spring`), the framework value is taken directly from the archetype name rather than from scanning.

Substitutions apply only to:
- `instructions.md` (`CLAUDE.md` / `AGENTS.md`) — project name, framework, test command
- Stack rule files — test command, build command
- `sdlc-pipeline.md` — test command (engineering rules section)

Agent bodies, skill bodies, and command bodies are copied verbatim — they contain workflow logic, not project-specific content.

## Overwrite Behaviour

Existing files are skipped by default. The command prints a warning for each skipped file. `--force` overrides this and overwrites all files.

## New Source Modules

| Module | Responsibility |
|---|---|
| `src/archetypes/command.ts` | Commander subcommand definition and entry point |
| `src/archetypes/registry.ts` | Archetype manifest definitions (name → template refs) |
| `src/archetypes/mapper.ts` | Target-aware output path and frontmatter mapping |
| `src/archetypes/scanner.ts` | Lite project scan for placeholder substitution |
| `src/archetypes/writer.ts` | Template loading, substitution, and file writing |

## Changes to Existing Modules

| Module | Change |
|---|---|
| `src/index.ts` | Register the new `archetype` subcommand alongside the existing default command |
| `src/types.ts` | Add `"commands"` to `ArtifactFamily` union |

## Developer Flow

1. Run `harness-gen archetype --list` to see available archetypes.
2. Run with `--dry-run` to preview what will be written.
3. Run without `--dry-run` to write files into the target project.
4. Open the target project in Claude Code (or Copilot / Cursor).
5. Fill in two optional details: project description in `CLAUDE.md` / `AGENTS.md`, and confirm the test command in the stack rule (already pre-filled by auto-detection).
6. Start working: run `/full-sdlc` or describe a feature — the `sdlc-orchestrator` agent handles the rest.

## Out of Scope

- Codex target support (deferred)
- LLM-augmented customization (deferred — Approach 3)
- Multiple targets in one run
- Updating/diffing existing archetype files (beyond `--force` overwrite)
- Generating archetypes from a user-defined template directory
