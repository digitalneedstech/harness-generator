---
description: Execute an approved implementation plan and keep an execution report.
---

Use the SDLC pipeline to execute an approved `implementation-plan`.

Treat the user message that follows this prompt as the approved `implementation-plan`, the target repository, and any current workspace constraints.

Execution rules:

1. Use the `implementation-plan` as the source of truth.
2. Preserve existing repository conventions and public APIs unless the plan says otherwise.
3. Do not expand scope silently.
4. If the plan is missing a blocking technical detail, stop and surface the gap instead of improvising architecture.
5. Keep a running `execution-report` with completed plan steps, files or subsystems changed, tests added or updated, docs updated, deviations from plan, and unresolved risks.
6. Before finishing, summarize the implementation so a reviewer can check it directly against the plan.

Implement the approved work, update tests and docs where required, and return the final `execution-report`.