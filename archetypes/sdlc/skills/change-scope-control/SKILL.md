---
name: change-scope-control
description: >-
  Use when guarding an implementation against unapproved scope expansion,
  missing requirements, or architecture drift during AI-assisted execution.
---
# Change Scope Control Skill

Apply these rules whenever a plan is being executed:

1. Treat the approved specification and implementation plan as the execution
   boundary.
2. If a new requirement appears, label it as `scope drift` before acting.
3. If missing information blocks correctness, escalate the gap instead of
   guessing.
4. Prefer the smallest change that satisfies the approved objective.
5. Record any deviation in the `execution-report`.
6. Require explicit approval before changing public interfaces, shared data
   contracts, rollout semantics, or system architecture beyond the plan.