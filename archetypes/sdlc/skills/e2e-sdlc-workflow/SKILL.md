---
name: e2e-sdlc-workflow
description: >-
  Use when the user wants the full SDLC pipeline executed as one workflow so
  specification, planning, implementation, and review happen in sequence with
  explicit handoffs.
---
# End-to-End SDLC Workflow Skill

Use this skill when a user wants one workflow to drive the feature from request
through review instead of invoking each stage manually.

## Entry conditions

Start from a feature request or an already approved later-stage artifact.

Before beginning execution, normalize the available context into:

- feature goal
- target repository or project
- business context
- explicit constraints
- non-functional requirements
- open assumptions

Ask only the smallest set of blocking questions needed to proceed safely.

## Sequential workflow

Run these stages in order. Treat the output of each stage as the input contract
for the next stage.

1. `specification`
   - Preferred agent: `requirements-analyst`
   - Required output: `specification`
   - Must capture scope, non-goals, acceptance criteria, system impacts, edge
     cases, observability expectations, and open assumptions.
2. `implementation-plan`
   - Preferred agent: `implementation-planner`
   - Required output: `implementation-plan`
   - Must define targets, design approach, contract changes, execution order,
     test strategy, operational checks, risks, and out-of-scope guardrails.
3. `execution`
   - Preferred agent: `implementation-executor`
   - Required output: `execution-report`
   - Must implement only the approved plan, update tests and docs as needed,
     and record any deviations or unresolved risks.
4. `review`
   - Preferred agent: `plan-reviewer`
   - Optional secondary agent: `team-reviewer`
   - Required output: `review-report`
   - Must review the implementation against the `specification` and
     `implementation-plan`, not only general code quality.
5. `ship-summary`
   - Produce only when requested or when the user asks for a final handoff.
   - Summarize the approved scope, implemented changes, tests, review outcome,
     and follow-ups.

## Stage gates

Apply these gates strictly:

1. Do not start `implementation-plan` until the `specification` exists unless
   the user explicitly provides an approved specification.
2. Do not start `execution` until the `implementation-plan` exists and is
   treated as approved.
3. Do not declare the workflow complete until `review-report` has been
   produced.
4. If review returns `changes required`, return to `execution`, update the
   `execution-report`, and run review again.
5. If new requirements appear during planning or execution, label them as
   `scope drift` and require approval before continuing beyond the approved
   plan.

## Handoff rules

At each boundary, pass forward the current artifact and keep terminology stable.
Do not reinterpret the original request from scratch at every stage.

- `specification` -> planner handoff: what must be built, what must not be
  built, what tests must prove, unresolved assumptions.
- `implementation-plan` -> executor contract: execution steps, expected
  outcomes, verification method, guardrails.
- `execution-report` -> review input: completed plan items, changed areas,
  tests and verification, deviations, remaining risks.

## Failure handling

If a stage is blocked, stop at that stage and report:

- the blocking issue
- why it prevents safe continuation
- the minimal decision or input needed to resume

Do not skip blocked stages and do not fabricate approvals.

## Completion criteria

A full workflow run is complete only when all of the following are true:

1. `specification` exists
2. `implementation-plan` exists
3. `execution-report` exists
4. `review-report` exists
5. any scope drift or unresolved risks are called out explicitly