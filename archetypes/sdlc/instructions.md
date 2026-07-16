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

---

## Knowledge Resources

When you need context to complete your task, load these wiki files. They are located in `wiki/`.

### Architecture & System Design
**When:** Planning features, debugging system interactions, understanding service boundaries
→ Load: `wiki/architecture-diagram.md`
Contains system architecture, service boundaries, data flows, and integration points

### API Implementation & Review
**When:** Implementing endpoints, reviewing API contracts, validating request/response formats
→ Load: `wiki/api-patterns-and-conventions.md`
Contains request/response envelopes, error codes, authentication headers, and API standards

### Testing & Coverage
**When:** Designing tests, evaluating coverage, choosing test types and frameworks
→ Load: `wiki/testing-strategy.md`
Contains minimum coverage requirements (70%), test types (unit/integration/api), and running tests

### Security & Compliance
**When:** Handling authentication, secrets, user data, or sensitive information
→ Load: `wiki/security-guidelines.md`
Contains authentication methods, secrets management, PII handling, and security checklist

### Deployment & Operations
**When:** Preparing for deployment, designing rollout, implementing health checks
→ Load: `wiki/deployment-and-ops.md`
Contains health check endpoints, graceful shutdown, deployment strategy, and monitoring

### Troubleshooting
**When:** Debugging unexpected behavior, investigating errors, getting help
→ Load: `wiki/troubleshooting.md`
Contains common issues, debugging tips, and support resources
