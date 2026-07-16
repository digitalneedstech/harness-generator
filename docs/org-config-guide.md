# Organization Configuration Guide

## Overview

The org-config system allows you to define organization-wide policies that automatically translate into AI agent instructions, validation rules, and documentation for all projects scaffolded from archetypes.

## Quick Start

1. Copy the template:
   ```bash
   cp archetypes/org-config-template.yaml org-config.yaml
   ```

2. Customize for your organization

3. Use when scaffolding projects:
   ```bash
   harness-gen archetype --name sdlc --target claude --project /my-service --org-config org-config.yaml
   ```

## Policy Categories

### Coding Conventions
Define language-specific conventions, import rules, and code patterns.

### API Design
Define request/response envelopes, authentication methods, error codes, and versioning.

### Testing
Define minimum coverage requirements, test types, and approved frameworks.

### Security
Define secrets management, PII handling, and authentication requirements.

### Deployment
Define health checks, rollout strategies, and operational requirements.

### Observability
Define logging format, tracing, and required metrics.

### Custom Policies
Add organization-specific policies that generate custom wiki files.

## How Policies Translate

### Policy → Wiki File
Each policy area generates a wiki file that agents load on-demand:
- `api_design` → `wiki/api-patterns-and-conventions.md`
- `testing` → `wiki/testing-strategy.md`
- `security` → `wiki/security-guidelines.md`
- `deployment` → `wiki/deployment-and-ops.md`
- Custom policies → `wiki/{wiki_file}`

### Policy → Rule File
Policies generate enforcement rule files in `.claude/rules/`:
- `policies.testing.minimum_coverage` → `.claude/rules/testing-coverage.md`
- `policies.security` → `.claude/rules/security-guidelines-enforced.md`
- `policies.api_design` → `.claude/rules/api-design-enforcement.md`

### Policy → Agent Instructions
Policies update agent instructions to enforce standards:
- `code-reviewer` agent validates testing, security, API design
- `implementation-executor` follows deployment and observability standards

## Examples

See `archetypes/examples/` for pre-built configurations:
- `org-config-startup.yaml` — Lightweight, rapid iteration
- `org-config-enterprise.yaml` — Large org with strict policies
- `org-config-regulated.yaml` — Fintech/healthcare compliance

## Validation

Before using an org-config, validate it:

```bash
harness-gen validate-config org-config.yaml
```

Validation checks:
- YAML syntax is valid
- All fields match JSON schema
- Coverage is 0-100
- Auth method is valid (oauth2, jwt, api-key, basic)
- Custom policies have valid names

## Enforcement Mechanisms

### Pre-Commit Validation
Pre-commit hooks enforce policies:
- Testing coverage check (if `minimum_coverage` set)
- Security scan (if `security` policy set)
- API format validation (if `api_design` policy set)

### Code Review
The `code-reviewer` agent enforces policies during review:
- Rejects code that violates policies
- Cites policy file
- References wiki for guidance

### Documentation
AGENTS.md and generated docs reference policies and wikis:
- Developers understand the "why" behind each policy
- Agents know when and how to load wikis for context

## Updating Policies

To update organization policies:

1. Edit `org-config.yaml`
2. Regenerate all projects:
   ```bash
   for project in /path/to/projects/*; do
     harness-gen archetype --name sdlc --target claude --project "$project" \
       --org-config org-config.yaml --force
   done
   ```
3. All projects now have updated wikis, rules, and agent instructions

## Common Patterns

### Startup (Rapid Iteration)
- Minimum 60% coverage
- JWT auth
- Basic PII scrubbing

See: `archetypes/examples/org-config-startup.yaml`

### Enterprise (Strict Standards)
- Minimum 80% coverage
- OAuth2 with scopes
- Advanced PII scrubbing
- Distributed tracing required

See: `archetypes/examples/org-config-enterprise.yaml`

### Regulated (Compliance)
- Minimum 90% coverage
- HSM-backed secrets
- Audit logging for PII
- Regulatory reporting

See: `archetypes/examples/org-config-regulated.yaml`

## Troubleshooting

### "Org config validation failed"
Run `harness-gen validate-config org-config.yaml` to see detailed errors.

### "Wiki files not generated"
Ensure org-config is provided: `--org-config org-config.yaml`

### "Enforcement artifacts missing"
Check that policies are set in org-config. Enforcement artifacts are only generated for policies that are defined.

### "Different policies across projects"
This means org-config wasn't used. Regenerate projects with org-config to sync policies.
