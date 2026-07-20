# Implementation Plan

## Objective

Deliver roadmap items 1–5 and 9 while retaining byte-stable behavior for existing built-in scan generation and using `.agent-harness/` for all local harness state.

## Targets

- `src/types.ts`, `src/index.ts`, `src/llm/prompts.ts`, `src/writers.ts`
- New `src/registry/`, `src/score/`, `src/validate/`, `src/extensions/`, and `src/self/` modules
- `src/enforcement/policyToArtifacts.ts`, `src/orgconfig/loader.ts`, `src/orgconfig/validator.ts`
- Built-in extension assets in `extensions/`
- `src/tests/`, `README.md`, and `.agent-harness/` stage artifacts

## Design Approach

Use a registry as the single source of truth for artifact family identities. Keep built-in request construction in the existing generator and let extension definitions contribute deterministic planned artifacts through registered render callbacks. Use the existing parser for constrained manifest syntax, a common JSON report convention for commands, and isolated pure functions for scoring, validation, scope calculation, and tier calculation.

## Contract Changes

- `ArtifactFamily` becomes an extensible string type while built-in names remain available as a narrow union.
- `OrgConfig.policies` gains optional `permissions` and `cost_policy` fields.
- Extension manifest fields are constrained to family identity, supported targets, templates, and command metadata.
- New CLI subcommands: `score`, `validate`, `extension`, `permissions`, `cost`, and `self`.

## Execution Steps

1. Create registry types and implementation; seed built-ins and discover target-local manifests.
2. Refactor CLI output parsing and generation setup to initialize the registry before request planning; update built-in prompting/writing interfaces only as needed to accept extension request providers.
3. Add extension asset installation/discovery and deterministic request providers for permissions and cost-policy.
4. Extend org-config parsing, validation, and policy artifact generation for extension policy input.
5. Add pure score computation, persistence, report rendering, and command integration.
6. Add pure validation checks, report rendering, and command integration.
7. Add self check/upgrade modules with npm metadata lookup, execution-mode detection, dry-run, timeout, and command integration.
8. Add unit and CLI coverage, update README command documentation, run build/tests, then review scope and regressions.

## Parallel Work

- Score and validate core functions can be built after registry interfaces stabilize.
- Self-update work is independent of registry and extension implementation.

## Test Strategy

- Unit-test registry lifecycle, manifest validation, and built-in fallback behavior.
- Test score calculation, malformed weights, persistence, and threshold exit behavior.
- Test each validation check against synthetic scan/baseline/config data.
- Test permission scope and cost-tier classification plus organization overrides.
- Stub npm metadata and child process behavior for self commands.
- Preserve existing pipeline/integration tests to prove built-in output compatibility.

## Operational Checks

- Verify commands in dry-run/mock modes on a temporary target.
- Ensure `.agent-harness/score.json` is created only by `score`.
- Ensure extension installation never overwrites existing local extension packages without `--force`.

## Risks and Mitigations

- Dynamic extensions could break deterministic generation: restrict manifests and use trusted built-in providers only.
- Existing YAML parser supports a subset of YAML: keep manifests simple, scalar/list based, and reject unsupported structures.
- Upgrade can mutate user environments: default to explicit command only, expose dry-run, and reject unsupported source/npx contexts.
- Native tool config could be overwritten: merge only known generated blocks and otherwise provide advisory artifacts.

## Out-of-Scope Guardrails

Do not implement roadmap items 6–8, remote catalog fetching, fleet APIs, arbitrary executable extension code, or changes to existing scan/clustering behavior.

## Review Checklist

- Built-in default generation paths and wrappers are unchanged.
- `.agent-harness/` is consistently used for state and extensions.
- All commands validate inputs and report actionable failures.
- Test suite and manual CLI dry-runs pass.
- Documentation covers new commands and limitations.
