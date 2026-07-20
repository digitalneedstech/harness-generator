# Review Report

## Verdict

changes required

## Findings

### Blocking

- Registry discovery accepts an arbitrary extension family, but only hard-coded `permissions` and `cost-policy` names produce requests. This violates the registry materialization acceptance criterion. The registry needs a validated declarative request/template contract (or an explicit trusted-provider mapping) for every discovered family.
- The normal `audit --update-baseline` workflow records no generated artifact inventory. As a result, `score` artifact coverage and `validate` orphaned-cluster/policy checks treat valid generated output as absent. Baseline creation must receive materialized artifact metadata or these commands must inspect the generated output set directly.
- Organization permission denies do not take precedence over the calculated allow/ask lists, so a mandatory denied action can appear in another list.
- Cost-policy stores a configured token budget but does not apply an executable cap or a native target policy. This only records advisory metadata and does not meet the enforcement requirement.

### Should-fix

- Manifest validation must reject unsupported target names and malformed/nonconforming package metadata rather than silently accepting partial content.
- Self-upgrade now rejects source checkouts and npm-script contexts, but should test and explicitly distinguish global, npx, local-link, and source modes.
- New command test coverage does not include full CLI workflows, invalid input, score report persistence, validation findings, or native settings merging.

### Nit

- The registry retains parsed `targets` only transiently; expose and use them in the family definition when declarative extension planning is added.

## Coverage Summary

- Registry: partially satisfied; built-ins and local discovery exist, but arbitrary registered-family rendering is missing.
- Score: partially satisfied; weighted computation, reporting, persistence, and gating exist, but normal artifact coverage is not reliable.
- Validate: partially satisfied; all requested check categories exist, but baseline metadata prevents reliable generation-state checks.
- Permissions: partially satisfied; classification and Claude settings merging exist, but mandatory-deny precedence is missing.
- Cost-policy: partially satisfied; classification and advisory metadata exist, but budget enforcement is missing.
- Self commands: partially satisfied; check, dry-run, timeout, and safer source handling exist; mode coverage remains incomplete.
- Scope: compliant. Roadmap items 6–8 were not added, and new state uses `.agent-harness/`.

## Test Assessment

`npm test` passed with 88 tests. Existing regression coverage remains green and new unit tests cover basic registry, scoring, extension classification, and upgrade-plan behavior. It is insufficient to prove the outstanding dynamic-rendering, baseline inventory, policy-precedence, and enforcement requirements.

## Scope Assessment

The changes remain within the approved items 1–5 and 9. The user-mandated `.agent-harness/` convention is consistently used for newly introduced state.
