import type { OrgConfig, EnforcementArtifact } from "../types.js";

export function generateEnforcementArtifacts(orgConfig: OrgConfig): EnforcementArtifact[] {
  const artifacts: EnforcementArtifact[] = [];

  // Testing policy → Pre-commit validation skill
  if (orgConfig.policies?.testing?.minimum_coverage) {
    artifacts.push({
      family: "rules",
      relativePath: "rules/testing-coverage.md",
      content: generateTestingCoverageRule(orgConfig.policies.testing.minimum_coverage),
      enforcedPolicy: "testing.minimum_coverage"
    });
  }

  // Security policy → Security guidelines rule
  if (orgConfig.policies?.security) {
    artifacts.push({
      family: "rules",
      relativePath: "rules/security-guidelines-enforced.md",
      content: generateSecurityRule(orgConfig.policies.security),
      enforcedPolicy: "security"
    });
  }

  // API design policy → API design rule
  if (orgConfig.policies?.api_design) {
    artifacts.push({
      family: "rules",
      relativePath: "rules/api-design-enforcement.md",
      content: generateApiDesignRule(orgConfig.policies.api_design),
      enforcedPolicy: "api_design"
    });
  }

  // Code reviewer agent instruction enhancement
  artifacts.push({
    family: "agents",
    relativePath: "agents/code-reviewer-enforcement.agent.md",
    content: generateCodeReviewerEnforcement(orgConfig),
    enforcedPolicy: "all"
  });

  return artifacts;
}

function generateTestingCoverageRule(minimumCoverage: number): string {
  return `# Testing Coverage Enforcement

## Minimum Coverage Requirement

All service code must maintain **minimum ${minimumCoverage}% test coverage**.

## Measurement

Coverage is measured using code coverage tools:
- Java: JaCoCo
- Python: pytest-cov
- TypeScript: Jest coverage

## Enforcement

Pre-commit hook validates:
\`\`\`bash
npm test -- --coverage
# Extract coverage percentage
# Compare to minimum ${minimumCoverage}%
# Block commit if below threshold
\`\`\`

If coverage is below ${minimumCoverage}%:
\`\`\`
✗ Coverage {actual}% is BELOW org policy minimum ${minimumCoverage}%
\`\`\`

## Exceptions

Contact team lead to request coverage exception with justification.
`;
}

function generateSecurityRule(security: any): string {
  const piiHandling = security.pii_handling || "Logs must not contain PII";
  const authRequired = security.authentication_required !== false;

  return `# Security Guidelines Enforcement

## PII Handling

${piiHandling}

Never log:
- Names, email addresses, phone numbers
- Social security numbers
- Credit cards or bank accounts
- IP addresses, device IDs

## Authentication

${authRequired ? "All endpoints require authentication." : ""}

## Secrets

No hardcoded secrets. All secrets from vaults only.

## Code Review Gate

Code reviewer enforces:
- No PII in logs
- No hardcoded secrets
- Authentication configured
- Error messages don't leak sensitive data
`;
}

function generateApiDesignRule(apiDesign: any): string {
  const auth = apiDesign.authentication?.method || "oauth2";
  const errorCodes = apiDesign.error_codes || [];

  let errorCodeSection = "";
  if (errorCodes.length > 0) {
    errorCodeSection = `## Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
${errorCodes.map((e: any) => `| ${e.code} | ${e.meaning} | ${e.http_status} |`).join("\n")}`;
  }

  return `# API Design Enforcement

## Authentication Method

All APIs use: **${auth}**

## Request/Response Envelopes

All responses follow the standard envelope format:
\`\`\`json
{
  "data": <payload>,
  "meta": { "timestamp", "request_id", "version" },
  "errors": null | [{ "code", "message", "details" }]
}
\`\`\`

${errorCodeSection}

## Code Review Gate

API review enforces:
- Requests/responses match envelope format
- Error codes from approved list
- Authentication configured
- Endpoint documentation complete
`;
}

function generateCodeReviewerEnforcement(config: OrgConfig): string {
  const enforcedPolicies: string[] = [];

  if (config.policies?.testing?.minimum_coverage) {
    enforcedPolicies.push(`- Testing: Minimum ${config.policies.testing.minimum_coverage}% coverage`);
  }
  if (config.policies?.security) {
    enforcedPolicies.push("- Security: No PII in logs, no hardcoded secrets");
  }
  if (config.policies?.api_design) {
    enforcedPolicies.push("- API Design: Standard envelope format, approved error codes");
  }

  return `---
name: code-reviewer-policy-enforcement
description: >-
  Code reviewer with org policy enforcement. Validates code against all
  organization policies: testing coverage, security standards, API design,
  deployment requirements.
---

# Code Reviewer with Policy Enforcement

You are a code reviewer enforcing organization policies during code review.

## Enforced Policies

${enforcedPolicies.join("\n")}

## Review Process

1. Load wiki files for context:
   - \`wiki/testing-strategy.md\` → For coverage validation
   - \`wiki/security-guidelines.md\` → For security checks
   - \`wiki/api-patterns-and-conventions.md\` → For API design

2. Validate against each policy:
   - If testing: Check coverage meets minimum
   - If security: Scan for PII, hardcoded secrets
   - If API: Validate envelope format, error codes

3. Report findings:
   - PASS: "All policies met"
   - FAIL: Cite policy, reference wiki, suggest fix

4. Block merge if policy violations found
`;
}
