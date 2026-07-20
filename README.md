# harness-gen — AI Agent Harness Generator

`harness-gen` creates structured, tool-native customization for AI coding agents. It scans a polyglot repository or scaffolds a ready-made workflow, then writes the correct files for Claude Code, GitHub Copilot, Cursor, Codex, or the standard output format.

Rather than asking an LLM to invent paths, frontmatter, and JSON configuration, `harness-gen` creates those wrappers deterministically in TypeScript. The model contributes only the prose body, so generated artifacts remain reviewable, versionable, and consistent across runs.

## Start Here: Choose the Capability You Need

Use this sequence to choose the shortest path to a useful harness.

| Step | Capability | Use it when | Result |
|---|---|---|---|
| 1 | [Scan your repository](#1-understand-a-repository) | You want the harness to reflect an existing codebase. | Dependency-aware clusters, endpoint discovery, and a scan summary. |
| 2 | [Generate agent artifacts](#2-generate-tool-native-agent-guidance) | You need instructions, rules, skills, hooks, or agents for a supported tool. | Native files in `.claude/`, `.github/`, `.cursor/`, or the selected target format. |
| 3 | [Scaffold an SDLC workflow](#3-scaffold-a-complete-sdlc-workflow) | You want a complete workflow without first scanning the project. | Prebuilt agents, skills, rules, and commands tailored to a stack. |
| 4 | [Validate and audit](#4-validate-and-track-drift) | You need confidence that generated guidance remains complete as code changes. | Cross-artifact validation and a committed drift baseline. |
| 5 | [Apply organization policy](#5-apply-organization-policy) | Teams need reusable testing, security, or API standards. | Policy-backed rules, agent guidance, and documentation. |
| 6 | [Add extensions and measure maturity](#6-add-extensions-and-measure-maturity) | You need permission guidance, cost guidance, or an operational health score. | Target-local extensions, advisory/native settings, and score reports. |
| 7 | [Maintain the CLI](#7-check-for-cli-updates) | A CI pre-flight or local setup needs version visibility. | Read-only update checks and a safe upgrade preview. |

Local harness state, extensions, baselines, and score data always live in `.agent-harness/`.

Before following a workflow, complete [requirements and installation](#requirements-and-installation).

## 1. Understand a Repository

Start with a scan when the generated guidance should match the code that already exists. Scanning detects TypeScript, TSX, Java, and Python source; recognizes Next.js App Router, Express, Spring Boot, FastAPI, and Flask endpoints; and groups related files by dependency proximity rather than directory.

```bash
# Inspect the repository without generating files
harness-gen --target /path/to/my-service --scan-only
```

Use the scan output to confirm that the project boundary, source languages, and clusters look correct before generating any agent files.

## 2. Generate Tool-Native Agent Guidance

After a successful scan, preview the planned artifacts, then generate either deterministic mock content or live LLM-assisted content.

```bash
# Preview paths and payloads before writing anything
harness-gen --target /path/to/my-service \
  --targets copilot \
  --outputs skills,rules,hooks,agents \
  --dry-run

# Generate deterministic content without an API key
harness-gen --target /path/to/my-service \
  --targets copilot \
  --outputs skills,rules,hooks,agents \
  --mock

# Generate live artifacts with an Anthropic API key
harness-gen --target /path/to/my-service \
  --targets claude \
  --outputs instructions,rules,skills,agents
```

### What scan-based generation creates

| Family | Description |
|---|---|
| `instructions` | Top-level repository guidance (`CLAUDE.md` or `AGENTS.md`) |
| `rules` | Scoped behavior rules per tool's native format |
| `skills` | High-signal workflow skills derived from cluster analysis |
| `hooks` | Deterministic validation hooks as structured config |
| `agents` | Specialized agents per dependency cluster |

### Where each target receives artifacts

| Family | claude | copilot | cursor |
|---|---|---|---|
| instructions | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| rules | `.claude/rules/*.md` | `.github/instructions/*.instructions.md` | `.cursor/rules/*.mdc` |
| agents | `.claude/agents/*.agent.md` | `.github/agents/*.agent.md` | `.cursor/agents/*.agent.md` |
| skills | `.claude/skills/*/SKILL.md` | `.github/skills/*/SKILL.md` | `.cursor/skills/*/SKILL.md` |
| commands | `.claude/commands/*.md` | `.github/prompts/*.prompt.md` | `.cursor/commands/*.md` |

Scan-based generation also supports `codex` and `standard` targets.

## 3. Scaffold a Complete SDLC Workflow

Use an archetype when you want a complete workflow immediately, rather than code-derived artifacts. Archetypes auto-detect the project name and build/test commands from `pom.xml`, `package.json`, `pyproject.toml`, `requirements.txt`, or `*.csproj`; they add placeholder comments when detection is not possible.

```bash
# See the available workflow and stack combinations
harness-gen archetype --list

# Review the target paths without writing
harness-gen archetype --name sdlc --target claude \
  --project /path/to/my-service --dry-run

# Install a stack-aware workflow
harness-gen archetype --name sdlc-java-spring --target claude \
  --project /path/to/my-service
```

| Archetype | Stack |
|---|---|
| `sdlc` | Base SDLC pipeline — specification → plan → execution → review |
| `sdlc-java-spring` | SDLC + Spring Boot conventions |
| `sdlc-dotnet` | SDLC + .NET / ASP.NET Core conventions |
| `sdlc-python-flask` | SDLC + Flask conventions |
| `sdlc-python-fastapi` | SDLC + FastAPI conventions |

## Requirements and Installation

- Node.js 22+
- npm
- Anthropic API key (for live generation; `--mock` works without one)

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

## 4. Validate and Track Drift

Run validation after generation to identify broken cross-artifact references and missing enforcement. Then create a baseline so future audits can detect code changes that make the harness stale.

```bash
# Check generated artifacts before committing them
harness-gen validate --target /path/to/my-service --fail-on-warning

# Create or intentionally refresh the committed baseline
harness-gen audit --target /path/to/my-service --update-baseline

# Run on later changes or in CI
harness-gen audit --target /path/to/my-service --fail-on-drift
```

### What `validate` checks

- References in generated instructions and rules that point to missing skills or agents.
- Clusters with no scoped agent artifact.
- Organization policies that have no enforcement artifact.
- Override directories in `.agent-harness/overrides/` that name an unregistered artifact family.

### What `audit` tracks

After generating harness artifacts, track changes in your repository and detect when new code or deleted files fall out of sync with your harness.

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

Exit codes:
- `0` — no blocking drift
- `1` — blocking drift detected (new uncovered clusters or stale references)
- `2` — configuration or runtime error (missing baseline, invalid target)

### Add an audit to GitHub Actions

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

## 5. Apply Organization Policy

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

## 6. Add Extensions and Measure Maturity

Extensions are deliberately target-local: install them in the repository that needs them, then include their registered families in `--outputs`.

```bash
# 1. Install the shipped extensions into the target repository
harness-gen extension add permissions --target /path/to/my-service
harness-gen extension add cost-policy --target /path/to/my-service

# 2. Generate their output with the rest of the harness
harness-gen --target /path/to/my-service \
  --targets claude \
  --outputs instructions,rules,skills,hooks,agents,permissions,cost-policy \
  --mock

# 3. Inspect the reasoning before or after generation
harness-gen permissions scope --target /path/to/my-service --cluster payments-service
harness-gen cost analyze --target /path/to/my-service --cluster docs-generator --explain

# 4. Measure harness health and gate CI if needed
harness-gen score --target /path/to/my-service --min-score 60
```

### Permissions extension

The `permissions` extension classifies each cluster from its files and dependency edges. For Claude it merges computed allow/ask/deny scopes into `.claude/settings.json`. Other targets receive a clearly labeled advisory file, rather than an unverified native configuration.

Organization-configured deny entries are included when an `--org-config` file is supplied.

### Cost-policy extension

The `cost-policy` extension assigns a transparent `lightweight` or `frontier` suggestion from endpoint count, dependency count, and business-critical file names. Claude metadata is written beneath `.agent-harness/cost-policy/`; other targets receive advisory guidance. An organization token-budget value is included when configured.

### Maturity score

`score` combines artifact coverage, audit drift, and organization-policy coverage. By default it writes `.agent-harness/score.json`; use `--format json` or `--report score.json` for automation and reporting.

```bash
harness-gen score --target /path/to/my-service \
  --weights coverage=0.5,drift=0.3,policy=0.2 \
  --format json --report score.json
```

## 7. Check for CLI Updates

Use `self check` as a read-only CI pre-flight. Use `self upgrade --dry-run` to view the exact global npm command before allowing it to modify an installation.

```bash
# Read-only version and compatibility check
harness-gen self check --fail-if-outdated

# Preview, then perform, a global npm upgrade
harness-gen self upgrade --dry-run
harness-gen self upgrade

# Upgrade to a specific npm tag or released version
harness-gen self upgrade --tag v1.4.0
```

`SELF_UPGRADE_TIMEOUT_SECS` limits the installer subprocess duration. Source checkouts and npx/local invocations are rejected so the CLI does not modify an unsafe or ambiguous installation.

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
