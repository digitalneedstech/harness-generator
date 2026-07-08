---
description: Run the full SDLC pipeline from feature request through review.
---

Use the SDLC pipeline end to end.

Treat the user message that follows this prompt as the feature request and target repository context.

Run the workflow in this order:

1. `specification`
2. `implementation-plan`
3. `execution`
4. `review`

Workflow rules:

1. Normalize the request into feature goal, target repository or project, business context, explicit constraints, non-functional requirements, and open assumptions.
2. Ask only the smallest set of blocking questions if critical information is missing.
3. Do not move to implementation until the `implementation-plan` exists.
4. Do not silently expand scope. If the request drifts, record the drift and ask for approval.
5. Do not declare completion until review has been run against both the `specification` and the `implementation-plan`.

Produce the named artifacts in order and keep terminology stable across stages.