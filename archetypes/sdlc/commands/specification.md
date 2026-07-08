---
description: Create a specification artifact for a feature request.
---

Use the SDLC pipeline to produce a `specification` artifact only.

Treat the user message that follows this prompt as the feature request and target context.

Do these things in order:

1. Normalize the request into feature goal, target repository or project, business context, explicit constraints, non-functional requirements, and open assumptions.
2. Ask only the smallest set of blocking questions if critical information is missing.
3. Produce a `specification` with these sections:
   - feature summary
   - business objective
   - in-scope behavior
   - out-of-scope behavior
   - users, actors, or systems involved
   - functional requirements
   - data or state impacts
   - API, UI, CLI, job, or workflow impacts
   - edge cases and failure modes
   - dependencies and constraints
   - observability, logging, metrics, or audit expectations
   - acceptance criteria
   - open assumptions and explicit decisions needed
4. End with a `Planner handoff` section that states what must be built, what must not be built, what must be validated in tests, and what assumptions remain unresolved.

Do not produce an implementation plan or code unless the user explicitly asks for the next stage.