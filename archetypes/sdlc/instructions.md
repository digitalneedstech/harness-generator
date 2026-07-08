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
