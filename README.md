# harness-gen

`harness-gen` scans a TypeScript, Java, or Python repository and generates AI coding-agent customization files that are structured for real tools instead of being dumped into a single generic prompt.

It is designed for teams that want a repeatable way to bootstrap repository guidance for Claude Code, GitHub Copilot, Cursor, Codex, and cross-tool agent workflows.

## Why use it

- Turn an existing codebase into tool-aware guidance instead of manually writing agent files from scratch.
- Generate repository instructions, rules, skills, hooks, and agent definitions from actual source structure.
- Keep wrappers deterministic in code so the model only writes the prose body.
- Support multi-language repositories with TypeScript, Java, and Python source.
- Produce artifacts that are easier for developers to review, version, and refine over time.

## What it generates

Artifact families:

- `instructions`
- `rules`
- `skills`
- `hooks`
- `agents`

Depending on the selected targets, generated files can include:

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/skills/*/SKILL.md`
- `.github/agents/*.agent.md`
- `.github/hooks/*.json`
- `.cursor/rules/*.mdc`
- `.claude/rules/*.md`
- `.claude/agents/*.md`
- `.claude/settings.json`
- `.codex/rules/*.rules`
- `.codex/agents/*.toml`
- `.codex/hooks.json`

## Who benefits from it

`harness-gen` is useful when you want to:

- onboard developers faster with repository-specific agent guidance
- standardize AI-assisted development across teams
- create a baseline instruction set before tuning prompts by hand
- generate consistent agent docs for open-source or internal repos
- avoid maintaining several tool-specific formats manually

## Supported inputs

Languages scanned:

- TypeScript
- TSX
- Java
- Python

Framework and endpoint detection currently supports:

- Next.js App Router
- Express
- Spring Boot annotations
- FastAPI
- Flask

## Requirements

- Node.js 22+
- npm

## Install from source

If you are using the GitHub repository directly:

```bash
git clone <your-fork-or-repo-url>
cd harness-gen
npm install
npm run build
```

To make the CLI available as `harness-gen` on your machine:

```bash
npm link
```

After that, you can run either:

```bash
harness-gen --help
```

or, without linking:

```bash
node index.js --help
```

## Live generation setup

For live LLM-backed generation, configure Anthropic credentials:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-haiku-4-5-20251001"
```

PowerShell:

```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
```

If you want to test the full generation flow without calling the API, use `--mock`.

## Quick start

1. Build the project.
2. Point `harness-gen` at a target repository.
3. Scan first.
4. Run a dry run or mock generation.
5. Generate real artifacts once the output looks right.

Example:

```bash
harness-gen --target D:\work\my-service --scan-only
harness-gen --target D:\work\my-service --targets copilot --outputs skills,rules,hooks,agents --dry-run
harness-gen --target D:\work\my-service --targets copilot --outputs skills,rules,hooks,agents --mock
```

## Core concepts

### `--target`

The repository to scan and the place where generated artifacts will be written.

### `--targets`

The AI tool or tool family you want to generate for.

Supported values:

- `standard`
- `claude`
- `cursor`
- `copilot`
- `codex`

If you omit `--targets`, `harness-gen` uses `standard`.

### `--outputs`

The artifact families you want to generate.

Supported values:

- `instructions`
- `rules`
- `skills`
- `hooks`
- `agents`

Backward-compatible alias:

- `claude` maps to `instructions`

## Default behavior

`harness-gen` has target-aware defaults for top-level repository guidance files.

- If `--targets` includes `claude`, `CLAUDE.md` is generated even when `instructions` is not included in `--outputs`.
- If `--targets` includes `copilot`, `cursor`, `codex`, or `standard`, `AGENTS.md` is generated even when `instructions` is not included in `--outputs`.

This means the tool can still generate the main repository entrypoint file for the chosen ecosystem even when you only request rules, skills, hooks, or agents.

## Common usage patterns

Scan a repository only:

```bash
harness-gen --target D:\work\my-service --scan-only
```

Generate a cross-tool baseline with mock content:

```bash
harness-gen --target D:\work\my-service --outputs instructions,rules,skills,hooks,agents --mock
```

Generate Claude-focused artifacts:

```bash
harness-gen --target D:\work\my-service --targets claude --outputs rules,agents
```

Generate Copilot-focused artifacts:

```bash
harness-gen --target D:\work\my-service --targets copilot --outputs skills,rules,hooks,agents
```

Generate Cursor and Copilot artifacts together:

```bash
harness-gen --target D:\work\my-service --targets cursor,copilot --outputs instructions,rules,skills,agents
```

Generate a full multi-tool bundle:

```bash
harness-gen --target D:\work\my-service --targets claude,cursor,copilot,codex --outputs instructions,rules,skills,hooks,agents
```

Run from inside the target repository:

```bash
harness-gen --outputs instructions,rules,skills,hooks,agents
```

Use the local development entrypoint instead of `npm link`:

```bash
node index.js --target D:\work\my-service --targets copilot --outputs skills,rules,hooks,agents --dry-run
```

## Recommended workflow

1. Run `--scan-only` to confirm the repository is being read correctly.
2. Run `--dry-run` to inspect the planned artifacts without writing files.
3. Run `--mock` if you want representative content without using Anthropic.
4. Run a live generation pass when credentials are configured.
5. Review the generated files inside the target repository.
6. Commit generated files in the target repository, not in `harness-gen`.

## CLI reference

- `--target <path>`: target repository path
- `--outputs <items>`: comma-separated artifact families
- `--targets <items>`: comma-separated tool targets
- `--tools <items>`: alias for `--targets`
- `--scan-only`: scan and summarize without generating files
- `--dry-run`: prepare artifact output without writing files
- `--mock`: use deterministic mock content instead of the live LLM
- `--max-files-per-prompt <count>`: limit files included in one generation window
- `--max-endpoints-per-prompt <count>`: limit endpoints included in one generation window

## How the tool is opinionated

- Agents are emitted as separate files rather than one oversized aggregate artifact.
- Skills are intentionally capped to a smaller high-signal set.
- Hooks are rendered as deterministic structured config files instead of unstructured markdown.
- Frontmatter, JSON, MDC, TOML, and similar wrappers are generated by code instead of being improvised by the model.

## Large repository behavior

For larger repositories, `harness-gen` works incrementally.

- Scan results are cached in `.agent-harness/cache.json` inside the target repository.
- Files are grouped into dependency-aware clusters instead of one massive prompt.
- Prompt window sizes can be tuned with `--max-files-per-prompt` and `--max-endpoints-per-prompt`.

## Open-source release usage guidance

If you publish this project on GitHub, users should be able to succeed with the following flow:

```bash
git clone <repo-url>
cd harness-gen
npm install
npm run build
npm link
harness-gen --target <path-to-their-repo> --scan-only
harness-gen --target <path-to-their-repo> --targets standard --outputs instructions,rules,skills,hooks,agents --dry-run
```

For users who do not want to link the CLI globally:

```bash
git clone <repo-url>
cd harness-gen
npm install
npm run build
node index.js --target <path-to-their-repo> --targets standard --outputs instructions,rules,skills,hooks,agents --dry-run
```

## Testing for maintainers

Run the project test suite:

```bash
npm test
```

Recommended verification flow after code changes:

```bash
npm run build
node index.js --target . --targets copilot --outputs skills,rules,hooks,agents --dry-run
node dist/index.js --target . --outputs instructions,rules,skills,hooks,agents --dry-run
node dist/index.js --target . --targets claude,cursor,copilot,codex --outputs instructions,rules,skills,hooks,agents --mock
```

## Testing for external contributors

If a developer clones the repository from GitHub and wants to verify it locally:

```bash
git clone <repo-url>
cd harness-gen
npm install
npm run build
npm test
node index.js --target <path-to-sample-repo> --targets copilot --outputs skills,rules,hooks,agents --dry-run
node dist/index.js --target <path-to-sample-repo> --outputs instructions,rules,skills,hooks,agents --dry-run
```

If they do not have Anthropic credentials, they can still validate generation logic with:

```bash
node dist/index.js --target <path-to-sample-repo> --targets claude,cursor,copilot,codex --outputs instructions,rules,skills,hooks,agents --mock
```

## Project scripts

```bash
npm run build
npm run typecheck
npm test
```

## Notes

- `harness-gen` generates a strong first draft, not a final truth source. Teams should still review generated files.
- The quality of generated guidance improves when the target repository has a clear structure, meaningful names, and consistent architecture.
- `--dry-run` and `--mock` are the safest ways to evaluate changes before writing artifacts into a repository.