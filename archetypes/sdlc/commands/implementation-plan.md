---
description: Turn an approved specification into an implementation plan.
---

Use the SDLC pipeline to produce an `implementation-plan` artifact only.

Treat the user message that follows this prompt as the approved `specification` and any additional repository context.

Do these things in order:

1. Use the provided `specification` as the source of truth.
2. If the specification is missing blocking information, ask only the smallest set of clarifying questions needed to plan safely.
3. Produce an `implementation-plan` with these sections in order:
   - objective
   - affected repositories, services, packages, or apps
   - affected subsystems and likely files or folders
   - selected technologies, frameworks, and patterns
   - data model, interface, or contract changes
   - implementation steps in execution order
   - parallelizable work
   - test strategy
   - observability or operational checks
   - risks and mitigations
   - out-of-scope guardrails
   - review checklist
4. End with an `Executor contract` section mapping each execution step to an expected outcome and verification method.

Do not implement code in this stage.