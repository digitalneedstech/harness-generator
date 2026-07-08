---
name: feature-specification
description: >-
  Use when creating a structured feature specification from a user request so
  later planning and implementation stages do not depend on guesswork.
---
# Feature Specification Skill

Produce a `specification` artifact with these sections, in order:

## Feature summary

One short paragraph describing the capability and why it matters.

## Business objective

Explain the user or business outcome this feature is meant to achieve.

## Scope

List the in-scope behaviors.

## Non-goals

List the explicit out-of-scope behaviors.

## Functional requirements

List each requirement as a distinct, testable statement.

## System impacts

Note affected APIs, UI surfaces, jobs, data flows, storage, permissions, or
configuration.

## Edge cases and failure modes

Cover invalid input, partial failure, retries, empty states, concurrency, and
rollback-sensitive conditions where relevant.

## Constraints and dependencies

Note technical, product, compliance, and sequencing constraints.

## Observability

State the logs, metrics, alerts, or auditability expectations if behavior is
operationally important.

## Acceptance criteria

Provide a flat list of concrete pass conditions.

## Open assumptions

List only the assumptions that could materially change implementation or test
scope.