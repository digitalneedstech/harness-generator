---
paths:
  - "**"
---

# .NET Stack Rules

## Build and test commands

Build: `{{build_command}}`
Test: `{{test_command}}`
Single test: `dotnet test --filter "FullyQualifiedName~TestName"`

## Conventions

- Use `async`/`await` consistently on all I/O-bound operations
- Inject dependencies through the built-in DI container via constructors
- Use `record` types for DTOs and value objects
- Bind configuration with `IOptions<T>` — no direct `ConfigurationManager` reads
- Use minimal API or controller-based routing consistently within a project

## Guardrails

- Never call `.Result` or `.Wait()` on async methods — deadlock risk
- Do not return domain entities directly from API controllers
- Do not store mutable state in `static` fields for per-request data
