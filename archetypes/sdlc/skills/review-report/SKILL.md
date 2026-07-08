---
name: review-report
description: >-
  Use when reporting review findings against a specification and implementation
  plan so approval is based on traceable coverage and not just general code
  quality impressions.
---
# Review Report Skill

Produce a `review-report` with these sections, in order:

## Verdict

Use one of: `approved`, `approved with follow-ups`, `changes required`.

## Findings

Group findings by severity: `blocking`, `should-fix`, `nit`.

Each finding must cite:

- the relevant file and line when available
- the violated plan item or acceptance criterion
- the consequence of leaving it unfixed

## Coverage summary

Summarize which planned items were satisfied, partially satisfied, missing, or
not verifiable.

## Test assessment

State whether the tests demonstrate the intended behavior and major failure
paths.

## Scope assessment

State whether the change stayed inside the approved scope.