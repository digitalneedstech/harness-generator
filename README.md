# harness-gen — AI Agent Harness Generator

`harness-gen` scans a polyglot repository and generates AI coding-agent customization files structured for real tools — not dumped into a single generic prompt file. It supports Claude Code, GitHub Copilot, Cursor, and Codex out of the box.

## Key Design Principle: Code Generates the Wrapper

Instead of asking a model to improvise frontmatter, JSON configs, and file paths, `harness-gen` generates those deterministically in TypeScript. The model only writes the prose body. This keeps artifacts reviewable, versionable, and consistent across runs.

Two complementary modes:

1. **Scan-based generation** — analyze source structure, cluster files by dependency, and call Claude to produce context-aware instructions, rules, skills, hooks, and agents
2. **Archetype scaffolding** — drop a complete pre-built SDLC workflow (agents + skills + rules + commands) into any project in one command, no scan required

## What It Generates

### Scan-based output

| Family | Description |
|---|---|
| `instructions` | Top-level repository guidance (`CLAUDE.md` or `AGENTS.md`) |
| `rules` | Scoped behavior rules per tool's native format |
| `skills` | High-signal workflow skills derived from cluster analysis |
| `hooks` | Deterministic validation hooks as structured config |
| `agents` | Specialized agents per dependency cluster |

### Archetype output

| Archetype | Stack |
|---|---|
| `sdlc` | Base SDLC pipeline — spec → plan → execution → review |
| `sdlc-java-spring` | SDLC + Spring Boot conventions |
| `sdlc-dotnet` | SDLC + .NET / ASP.NET Core conventions |
| `sdlc-python-flask` | SDLC + Flask conventions |
| `sdlc-python-fastapi` | SDLC + FastAPI conventions |

## Target Tool Support

Both modes adapt paths, frontmatter, and file extensions to the selected tool:

| Family | claude | copilot | cursor |
|---|---|---|---|
| instructions | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| rules | `.claude/rules/*.md` | `.github/instructions/*.instructions.md` | `.cursor/rules/*.mdc` |
| agents | `.claude/agents/*.agent.md` | `.github/agents/*.agent.md` | `.cursor/agents/*.agent.md` |
| skills | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | `.cursor/skills/*/SKILL.md` |
| commands | `.claude/commands/*.md` | `.github/prompts/*.prompt.md` | `.cursor/commands/*.md` |

Scan-based generation also supports `codex` and `standard` targets.

## Supported Languages and Frameworks

Source scanning covers TypeScript, TSX, Java, and Python. Endpoint detection supports Next.js App Router, Express, Spring Boot annotations, FastAPI, and Flask.

## Requirements

- Node.js 22+
- npm
- Anthropic API key (for live generation; `--mock` works without one)

## Install

```bash
git clone <repo-url>
cd harness-gen
npm install
npm run build
npm link          # makes 'harness-gen' available globally
```

Without `npm link`, use `node index.js` in place of `harness-gen` throughout.

## Quick Start

### Scan-based generation

```bash
# 1. Confirm the scan reads your repo correctly
harness-gen --target /path/to/my-service --scan-only

# 2. Preview planned artifacts
harness-gen --target /path/to/my-service --targets copilot --outputs skills,rules,hooks,agents --dry-run

# 3. Generate with mock content (no API key needed)
harness-gen --target /path/to/my-service --targets copilot --outputs skills,rules,hooks,agents --mock

# 4. Generate live artifacts
export ANTHROPIC_API_KEY="sk-ant-..."
harness-gen --target /path/to/my-service --targets claude --outputs instructions,rules,skills,agents
```

### Archetype scaffolding

```bash
# List available archetypes
harness-gen archetype --list

# Preview what will be written
harness-gen archetype --name sdlc --target claude --project /path/to/my-service --dry-run

# Scaffold the SDLC workflow
harness-gen archetype --name sdlc-java-spring --target claude --project /path/to/my-service
```

Archetypes auto-detect project name and build/test commands from `pom.xml`, `package.json`, `pyproject.toml`, `requirements.txt`, or `*.csproj`. Placeholder comments are inserted when none are found.

## Live Generation Setup

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-haiku-4-5-20251001"   # optional; this is the default
```

PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

## CLI Reference

### Main command

| Option | Description |
|---|---|
| `--target <path>` | Repository to scan and write artifacts into |
| `--targets <items>` | Comma-separated tool targets: `standard`, `claude`, `cursor`, `copilot`, `codex` |
| `--outputs <items>` | Comma-separated families: `instructions`, `rules`, `skills`, `hooks`, `agents` |
| `--scan-only` | Scan and summarize without generating files |
| `--dry-run` | Prepare content without writing files |
| `--mock` | Use deterministic mock content instead of the live LLM |
| `--max-files-per-prompt <n>` | Files per generation window (default: 25) |
| `--max-endpoints-per-prompt <n>` | Endpoints per generation window (default: 80) |

### `archetype` subcommand

| Option | Description |
|---|---|
| `--name <archetype>` | Archetype to scaffold |
| `--project <path>` | Target project directory (default: current directory) |
| `--target <tool>` | Tool target: `claude`, `copilot`, `cursor` (default: `claude`) |
| `--dry-run` | Print planned paths without writing |
| `--force` | Overwrite existing files |
| `--list` | List available archetypes and exit |

## How the Tool Is Opinionated

- **Separate files over aggregates** — each agent and skill gets its own file rather than being concatenated into one oversized artifact
- **Deterministic wrappers** — frontmatter, JSON, MDC, and TOML are generated by code; the model does not improvise structure
- **Incremental scans** — results are cached in `.agent-harness/cache.json`; only changed files are re-processed
- **Dependency-aware clustering** — files are grouped by import graph proximity, not directory, to produce tighter prompt windows

## Testing

```bash
npm test
```

Verify after code changes:

```bash
npm run build
node index.js --target . --targets copilot --outputs skills,rules,hooks,agents --dry-run
node index.js archetype --name sdlc --target claude --project /tmp/test-project --dry-run
```
