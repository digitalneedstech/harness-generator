# Specification

## Objective

Implement roadmap items 1–5 and 9 from [roadmap/harness-gen-next-changes-implementation-v1.1.md](../roadmap/harness-gen-next-changes-implementation-v1.1.md): an extensible artifact-family registry; `score` and `validate` CLI commands; `permissions` and `cost-policy` extensions; and `self check` / `self upgrade` commands.

## Scope

- Extension state and discovery live beneath `.agent-harness/`, not `.harness/`.
- Existing built-in generation output remains unchanged when no extension is installed.
- Registered extension families are valid `--outputs` values.
- `score` provides weighted, persisted maturity data and optional gating.
- `validate` reports cross-artifact issues and can gate warnings.
- Built-in extension packages provide deterministic permissions and cost-policy advice, with target-specific output where supported.
- Self-update checks npm metadata read-only and safely identifies upgrade mechanisms before executing an installer.

## Functional Requirements

1. Registry
   - Seed the six existing built-in families.
   - Discover well-formed manifests from `<target>/.agent-harness/extensions/*/manifest.yaml`.
   - Reject malformed, duplicate, unsupported, or unsafe extension definitions with actionable errors.
   - Preserve all current planned artifact paths and wrappers for built-ins.
2. Score
   - Calculate coverage, drift penalty, and policy coverage on a 0–100 scale.
   - Read audit baseline when present without requiring it.
   - Persist `.agent-harness/score.json` unless a report-only path is requested.
   - Support JSON/text reports, explicit weights, and `--min-score` exit gating.
3. Validate
   - Report dangling artifact references, orphaned clusters, policy enforcement gaps, and unregistered override directories.
   - Be non-mutating and return non-zero only for warnings when requested.
4. Extensions
   - `permissions` computes deny/ask/allow scopes based on cluster files and dependencies, merges mandatory organization denies, and produces native Claude settings or visible advisory guidance elsewhere.
   - `cost-policy` selects lightweight or frontier tiers from transparent complexity signals, honors an organization token-budget ceiling, and emits native Claude-compatible metadata or visible advisory guidance.
5. Self commands
   - `self check` compares the installed package version to npm registry metadata, supports JSON output, and can fail if outdated.
   - `self upgrade` supports dry-run and an optional version/tag, detects unsupported execution modes, and caps child process time using `SELF_UPGRADE_TIMEOUT_SECS`.

## Acceptance Criteria

- `npm test` passes, including unchanged existing tests.
- The default dry-run output remains stable for all built-in family/target combinations.
- A target-local extension manifest causes its family to be accepted in `--outputs` and its artifacts to materialize deterministically.
- New commands have unit and CLI/workflow coverage for their success and primary failure cases.
- All persisted local state is under `.agent-harness/`.

## Assumptions and Deferred Scope

- Roadmap items 6–8 (preset resolution, fleet, bundles) are excluded.
- No third-party YAML parser is added; manifests use the existing constrained YAML loader.
- Extension installation/catalog distribution is not specified in the requested items. The shipped extension definitions are copied to a target only by the explicit `extension add` command implemented as minimal local package installation.
- Native Cursor permission configuration is version-dependent and unsupported by this codebase; it receives advisory output.
