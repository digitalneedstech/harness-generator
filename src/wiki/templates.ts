import type { WikiFile } from "../types.js";

export function getFixedWikiTemplates(): WikiFile[] {
  return [
    {
      filename: "architecture-diagram.md",
      title: "System Architecture",
      description: "System architecture, service boundaries, data flows, and integration points",
      content: `# System Architecture

## Component Diagram

\`\`\`mermaid
graph TB
    User["👤 User"]
    API["🔌 API Gateway"]
    Service["⚙️ Service"]
    DB["🗄️ Database"]

    User -->|Request| API
    API -->|Route| Service
    Service -->|Query| DB
\`\`\`

## Data Flow

\`\`\`mermaid
sequenceDiagram
    User->>API: Request
    API->>Service: Process
    Service->>DB: Persist
    DB-->>Service: Response
    Service-->>API: Result
    API-->>User: Response
\`\`\`

## Service Boundaries

[Document your services and their responsibilities here]

## Integration Points

[Document how services integrate, message queues, events, etc.]
`,
      isFixed: true
    },
    {
      filename: "api-patterns-and-conventions.md",
      title: "API Design Patterns & Conventions",
      description: "Request/response envelopes, error codes, authentication, versioning",
      content: `# API Design Patterns & Conventions

## Request/Response Envelope

All API responses follow this structure:

\`\`\`json
{
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2026-07-15T10:00:00Z",
    "request_id": "req-abc123",
    "version": "v1"
  },
  "errors": null
}
\`\`\`

## Error Responses

\`\`\`json
{
  "data": null,
  "meta": {
    "timestamp": "2026-07-15T10:00:00Z",
    "request_id": "req-abc123"
  },
  "errors": [
    {
      "code": "E001",
      "message": "Invalid request",
      "details": {
        "field": "email",
        "reason": "not a valid email format"
      }
    }
  ]
}
\`\`\`

## Error Codes

| Code | Meaning | HTTP Status |
|------|---------|-------------|
| E001 | Invalid Request | 400 |
| E002 | Unauthorized | 401 |
| E003 | Forbidden | 403 |
| E500 | Internal Error | 500 |

## Authentication

All requests require OAuth 2.0 Bearer token:

\`\`\`
Authorization: Bearer <token>
\`\`\`

Required scopes:
- \`read:api\` - Read access
- \`write:api\` - Write access

## Versioning

API version is indicated in the meta response. Current version: v1.
`,
      isFixed: true
    },
    {
      filename: "testing-strategy.md",
      title: "Testing Strategy",
      description: "Test types, coverage requirements, frameworks, and best practices",
      content: `# Testing Strategy

## Minimum Coverage

All service code must maintain **minimum 70% test coverage**.

Coverage is measured at:
- **Unit tests**: Cover individual functions and methods
- **Integration tests**: Cover service-to-service interactions
- **API tests**: Cover endpoint contracts

## Test Types

### Unit Tests

Test individual functions in isolation:
- Fast (< 1 second per test)
- Use mocks for dependencies
- Framework: [Your Framework - e.g., Jest, JUnit5, pytest]

### Integration Tests

Test service interactions:
- Medium speed (< 5 seconds per test)
- Use test database or real services
- Framework: [Your Framework]

### API Tests

Test endpoint contracts:
- Test request/response envelopes
- Test error cases
- Test authentication and authorization

## Running Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test file
npm test -- src/services/user.test.ts

# Run with coverage
npm test -- --coverage
\`\`\`

## Coverage Report

After running tests with coverage, check the report:

\`\`\`bash
# Generate HTML report
npm test -- --coverage

# View in browser
open coverage/index.html
\`\`\`

Minimum 70% coverage is enforced pre-commit.
`,
      isFixed: true
    },
    {
      filename: "security-guidelines.md",
      title: "Security Guidelines",
      description: "Authentication, secrets, PII handling, and security best practices",
      content: `# Security Guidelines

## Authentication

All authenticated endpoints require OAuth 2.0 Bearer token.

## Secrets Management

**NEVER hardcode secrets.** All secrets must come from vaults:
- Environment variables (development)
- Secret management service (production)

Approved tools:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

## PII Handling

**Never log PII.** PII includes:
- Names
- Email addresses
- Phone numbers
- Social security numbers
- Credit card numbers
- IP addresses
- Device IDs

### Logging PII

Before logging data that might contain PII, use scrubbers:

\`\`\`typescript
import { PiiScrubber } from "./scrubbers";

logger.info("User data", PiiScrubber.mask(userData));
\`\`\`

### Error Messages

Never return PII in error messages. Return generic errors to clients:

\`\`\`typescript
// WRONG
throw new Error(\`User not found: \${email}\`);

// RIGHT
throw new Error("User not found");
logger.error("User lookup failed", { email }); // Log details separately
\`\`\`

## Security Checklist

Before deployment:
- [ ] No hardcoded secrets
- [ ] All endpoints require authentication
- [ ] PII never logged
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced
- [ ] Security headers configured
`,
      isFixed: true
    },
    {
      filename: "deployment-and-ops.md",
      title: "Deployment & Operations",
      description: "Health checks, readiness checks, deployment strategies, monitoring",
      content: `# Deployment & Operations

## Health Checks

### Liveness Check (/health)

Returns 200 if service is running:

\`\`\`bash
GET /health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-07-15T10:00:00Z"
}
\`\`\`

### Readiness Check (/ready)

Returns 200 if service is ready to serve traffic (dependencies available):

\`\`\`bash
GET /ready
\`\`\`

Response:
\`\`\`json
{
  "ready": true,
  "checks": {
    "database": "ok",
    "cache": "ok"
  }
}
\`\`\`

## Graceful Shutdown

Services must shut down gracefully within **30 seconds**:
1. Stop accepting new requests
2. Wait for in-flight requests to complete (up to 30s)
3. Close database connections
4. Exit with code 0

## Deployment Strategy

Blue-green deployment is supported:
1. Deploy new version (green) alongside current (blue)
2. Run smoke tests on green
3. Switch traffic to green
4. Keep blue as rollback

## Monitoring

### Required Metrics

Export these metrics to Prometheus:
- \`request_duration_seconds\` - Request latency (histogram)
- \`request_count_total\` - Total requests (counter)
- \`error_count_total\` - Total errors (counter)

### Tracing

All requests include trace ID:

\`\`\`
X-Trace-ID: <uuid>
\`\`\`

This header is passed to downstream services for distributed tracing.
`,
      isFixed: true
    },
    {
      filename: "troubleshooting.md",
      title: "Troubleshooting",
      description: "Common issues, debugging tips, and support",
      content: `# Troubleshooting

## Common Issues

### Service won't start

1. Check environment variables are set
2. Verify database connection
3. Check logs for errors

\`\`\`bash
# View recent logs
docker logs <container-id> --tail 50

# Or in Kubernetes
kubectl logs <pod-name> --tail 50
\`\`\`

### High latency

1. Check database query performance
2. Check downstream service latency
3. Monitor memory and CPU usage

\`\`\`bash
# Check metrics
curl http://localhost:8080/metrics | grep request_duration
\`\`\`

### Authentication failures

1. Verify OAuth token is valid
2. Check token hasn't expired
3. Verify token scope includes required permissions

## Debugging Tips

1. Enable debug logging:
   \`\`\`bash
   DEBUG=* npm start
   \`\`\`

2. Add trace IDs to logs for request correlation

3. Use distributed tracing to follow requests across services

## Getting Help

- Check wiki files (architecture, api-patterns, security-guidelines)
- Review recent changes: \`git log --oneline -20\`
- Check runbook for your service type
`,
      isFixed: true
    }
  ];
}

export function getDynamicWikiTemplate(
  policyName: string,
  wikiFilename: string
): WikiFile {
  const templates: Record<string, () => WikiFile> = {
    pii_handling: () => ({
      filename: wikiFilename,
      title: "PII Handling Policy",
      description: "How to classify, handle, and protect personally identifiable information",
      content: `# PII Handling Policy

## PII Classification

These fields are classified as PII:
- Names, email addresses, phone numbers
- Social security numbers, passport numbers
- Credit card and bank account numbers
- IP addresses, device IDs
- Geolocation data

## Where PII Appears

\`\`\`mermaid
graph LR
    Request["HTTP Request"]
    Logs["Application Logs"]
    Cache["Cache"]
    DB["Database"]

    Request -->|PII OK| DB
    Request -->|NO PII| Logs
    Request -->|Hash Only| Cache
    DB -->|Scrub on Log| Logs
\`\`\`

## Scrubbing Rules

Before logging:
\`\`\`typescript
import { PiiScrubber } from "./scrubbers";

// DO NOT:
logger.info("User created", userData);

// DO:
logger.info("User created", PiiScrubber.mask(userData));
\`\`\`

## Error Handling with PII

\`\`\`typescript
// WRONG - leaks PII
throw new Error(\`User not found: \${email}\`);

// RIGHT - generic error to client
throw new CustomError("User not found");
logger.error("User lookup failed", { email }); // Log separately
\`\`\`
`,
      isFixed: false
    }),
    multi_tenancy: () => ({
      filename: wikiFilename,
      title: "Multi-Tenancy Architecture",
      description: "How multi-tenancy is implemented and data is isolated",
      content: `# Multi-Tenancy Architecture

## Tenant Isolation

\`\`\`mermaid
graph TB
    User1["User<br/>Tenant A"]
    User2["User<br/>Tenant B"]
    API["API Gateway"]
    Service["Service"]

    User1 -->|tenant_id| API
    User2 -->|tenant_id| API
    API -->|Route| Service
    Service -->|Query<br/>WHERE tenant_id| DB[("Database")]

    style User1 fill:#e1f5ff
    style User2 fill:#fff3e0
    style DB fill:#f3e5f5
\`\`\`

## Tenant Identification

Every request must include tenant ID:

\`\`\`json
{
  "data": { ... },
  "meta": {
    "tenant_id": "tenant-abc123"
  }
}
\`\`\`

## Data Isolation

All queries include tenant filter:

\`\`\`sql
SELECT * FROM users WHERE tenant_id = ?
\`\`\`

Never query without tenant filter.

## Cross-Tenant Checks

Always verify tenant ownership before access:

\`\`\`typescript
const user = await db.users.findById(userId);
if (user.tenant_id !== requestTenantId) {
  throw new ForbiddenError("Access denied");
}
\`\`\`
`,
      isFixed: false
    })
  };

  const template = templates[policyName];
  if (!template) {
    throw new Error(`No template for policy: ${policyName}`);
  }

  return template();
}
