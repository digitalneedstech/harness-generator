---
name: implementation-plan
description: >-
  Use when turning an approved specification into a detailed implementation
  plan with execution order, architecture choices, testing strategy, and review
  checkpoints.
---
# Implementation Plan Skill

Produce an `implementation-plan` artifact with these sections, in order:

## Objective

Restate the delivery goal in one short paragraph.

## Targets

Identify the repositories, packages, services, apps, modules, or folders likely
to change.

## Design approach

State the intended architecture, patterns, and why they fit the existing
system.

## Contract changes

Note model, API, schema, event, configuration, or UX contract changes.

## Execution steps

Number the implementation steps in the order they should happen.

## Parallel work

Identify any tasks that can safely happen in parallel.

## Test strategy

Specify the tests to add or update and what each one proves.

## Operational checks

State required migrations, configuration, rollout steps, monitoring, or manual
validation.

## Risks and mitigations

List the major failure risks and how they will be controlled.

## Out-of-scope guardrails

State what the executor should not change.

## Review checklist

List the exact conditions a reviewer should verify.