---
name: test-strategy
description: >-
  Use when defining or reviewing the test coverage expected for a planned or
  implemented feature, including functional, regression, and operational
  verification.
---
# Test Strategy Skill

When asked for testing guidance, define coverage across these layers when they
apply:

## Unit tests

Validate core branching logic, data transformation, and error handling.

## Integration tests

Validate repository, API, database, queue, or service boundary behavior.

## End-to-end or workflow checks

Validate the user-visible or system-visible workflow outcome for the feature.

## Regression focus

Call out existing behavior most likely to break because of the change.

## Manual verification

List only the manual checks that automation cannot reasonably cover.

## Evidence expectation

Each proposed test should state what behavior it proves and which acceptance
criterion or risk it covers.