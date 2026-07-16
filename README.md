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

### Using npm (recommended)

Install globally to use `harness-gen` command anywhere:

```bash
npm install -g agent-harness-cli
harness-gen --version
```

Use without installing globally:

```bash
npx agent-harness-cli --help
```

### From source (for development/contributing)

Clone the repository and build locally:

```bash
git clone https://github.com/digitalneedstech/harness-generator.git
cd harness-generator
npm install
npm run build
npm link          # Links local version globally for testing
```

After making changes, rebuild with `npm run build` and changes are reflected in your linked `harness-gen` command.

## Publishing (for maintainers)

### First-time npm setup

If you haven't published to npm before:

1. Create an npm account at https://www.npmjs.com
2. Authenticate locally:
   ```bash
   npm login
   ```
   Enter your npm username, password, and email when prompted.

### Publishing a new version

Each release, update the version and publish:

```bash
# Update version (patch/minor/major based on semver)
npm version patch

# Verify package contents before publishing
npm pack --dry-run

# Publish to npm registry
npm publish
```

After publishing, the new version appears at: https://www.npmjs.com/package/agent-harness-cli

### Verification

Test the published package:

```bash
npm install -g agent-harness-cli@latest
harness-gen --version
```

Users can now install with: `npm install -g agent-harness-cli`

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

### Baseline Drift Check (`audit`)

After generating harness artifacts, track changes in your repository and detect when new code or deleted files fall out of sync with your harness.

#### Creating a baseline

Run this after intentionally generating or updating harness artifacts:

```bash
harness-gen audit --target /path/to/my-service --update-baseline
```

This writes `.agent-harness/baseline.json` with:
- Hash of each source file
- Cluster composition
- Paths to generated artifacts
- Configured threshold for acceptable drift

Commit both the generated artifacts **and** the baseline file:

```bash
git add .agent-harness/baseline.json .claude/ .github/
git commit -m "Initialize harness with baseline"
```

#### Running audit checks

On each PR, compare the live repository against the baseline:

```bash
harness-gen audit --target /path/to/my-service --fail-on-drift
```

Exit codes:
- `0` — no blocking drift
- `1` — blocking drift detected (new uncovered clusters or stale references)
- `2` — configuration or runtime error (missing baseline, invalid target)

#### GitHub Actions integration

Use the provided workflow example to make drift checks mandatory on PRs:

```bash
# Copy the workflow template
cp .github/workflows/harness-drift-check.yml your-repo/.github/workflows/

# Or create it manually in your repo at .github/workflows/harness-drift-check.yml
```

Then configure GitHub branch protection:

1. Go to **Settings → Branches → Branch protection rules**
2. Enable **Require status checks to pass before merging**
3. Select **Harness Drift Check**
4. Save

Now a PR cannot merge until the drift check passes.

### Organization Configuration (org-config)

Define organization-wide policies once, automatically enforce across all projects:

```bash
# 1. Copy the org-config template
cp archetypes/org-config-template.yaml org-config.yaml

# 2. Customize for your organization
# - Define testing coverage minimum (e.g., 70%)
# - Define API design standards (e.g., request envelope format)
# - Define security policies (e.g., PII handling)
# - Add custom org-specific policies

# 3. Scaffold a new project with org policies
harness-gen archetype --name sdlc \
  --target claude \
  --project /my-service \
  --org-config org-config.yaml
```

What gets generated:
- **Wiki files** (`wiki/`) — Mermaid diagrams and documentation agents load on-demand
- **Enforcement rules** (`.claude/rules/`) — Guardrails that validate policy compliance
- **Agent instructions** (`.claude/agents/`) — Updated with policy enforcement
- **AGENTS.md** — Instructions for agents to load wikis contextually

See [org-config user guide](docs/org-config-guide.md) for:
- Policy categories and examples
- How policies translate to enforcement artifacts
- Common patterns (startup, enterprise, regulated)
- Troubleshooting

Example org-configs:
- `archetypes/examples/org-config-startup.yaml` — Rapid iteration
- `archetypes/examples/org-config-enterprise.yaml` — Strict standards
- `archetypes/examples/org-config-regulated.yaml` — Compliance-heavy

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

### `audit` subcommand

Compare the current repository against the committed baseline and report drift:

| Option | Description |
|---|---|
| `--target <path>` | Repository to audit (default: current directory) |
| `--baseline <path>` | Baseline file path (default: `.agent-harness/baseline.json`) |
| `--format <type>` | Report format: `text`, `markdown`, `json` (default: `text`) |
| `--report <path>` | Write report to file |
| `--fail-on-drift` | Exit non-zero on blocking drift (default in CI) |
| `--no-fail-on-drift` | Exit zero even with drift (default locally) |
| `--cluster-drift-threshold <percent>` | Cluster composition drift threshold (default: `25`) |
| `--update-baseline` | Create or update baseline from current scan |

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
