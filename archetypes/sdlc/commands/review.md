---
description: Review an implementation against the specification and plan.
---

Use the SDLC pipeline to produce a `review-report` only.

Treat the user message that follows this prompt as the relevant `specification`, `implementation-plan`, `execution-report`, and changed code context.

Review priorities, in order:

1. specification coverage
2. plan adherence
3. correctness of implemented behavior
4. test coverage relative to acceptance criteria
5. architecture or pattern drift
6. undocumented scope expansion

Produce a `review-report` with these sections:

### Verdict

One of: `approved`, `approved with follow-ups`, `changes required`

### Findings

Group findings by severity: `blocking`, `should-fix`, `nit`.
Each finding must reference the violated part of the specification or plan.

### Coverage check

State which planned items were completed, partially completed, skipped, or not verifiable.

### Test check

State whether the implemented tests cover the acceptance criteria and notable failure modes.

### Scope drift

State whether the implementation introduced any unplanned behavior or surface area.

Do not rewrite the implementation yourself unless the user explicitly asks for fixes after the review.