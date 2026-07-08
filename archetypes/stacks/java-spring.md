---
paths:
  - "**"
---

# Java / Spring Boot Stack Rules

## Build and test commands

Build: `{{build_command}}`
Test: `{{test_command}}`
Single test: `./mvnw test -Dtest=ClassName#methodName`

## Conventions

- Use Spring Boot annotations: `@RestController`, `@Service`, `@Repository`, `@Component`
- Use constructor injection — not field injection with `@Autowired`
- Mark service methods that modify state with `@Transactional`
- Use DTOs for request/response bodies; keep entity classes for persistence only
- Validate request bodies with `@Valid` and Bean Validation annotations
- Handle exceptions globally with `@ControllerAdvice` and `@ExceptionHandler`

## Guardrails

- Do not use `@Autowired` field injection
- Do not expose JPA entity classes directly in API responses
- Do not catch and swallow exceptions without logging or rethrowing
- Do not use raw generic types
