---
paths:
  - "**"
---

# SDLC Pipeline Instructions

Use this package to run software delivery through explicit stage artifacts.

## Stage order

Work in this order unless the user explicitly provides a later approved stage:

1. `specification`
2. `implementation-plan`
3. `execution-report`
4. `review-report`

## Workflow rules

Do not begin implementation until an `implementation-plan` exists.
Do not silently expand scope beyond the approved `specification` and
`implementation-plan`.
Do not declare the work complete until review has checked correctness, tests,
and scope adherence.

## Output rules

Keep artifact names stable across all agents.
Use the current approved artifact as the source of truth for the next stage.
If assumptions remain unresolved, label them explicitly instead of hiding them
inside prose.

## Engineering rules

Prefer minimal, root-cause changes.
Follow the existing repository conventions.
Update tests for changed behavior.
Update docs when the user-facing or operator-facing workflow changes.