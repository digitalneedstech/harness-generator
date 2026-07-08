---
paths:
  - "**"
---

# Python / FastAPI Stack Rules

## Build and test commands

Test: `{{test_command}}`
Single test: `python -m pytest tests/path/test_file.py::test_name -v`
Coverage: `python -m pytest --cov`

## Conventions

- Use Pydantic models for all request and response bodies
- Use `Depends()` for dependency injection
- Organize routes in separate router modules and mount with `app.include_router()`
- Use `async def` for I/O-bound route handlers
- Use the `lifespan` context manager for startup and shutdown events

## Guardrails

- Do not return raw `dict` from endpoints — use Pydantic response models
- Do not call synchronous blocking functions inside `async def` handlers
- Do not store mutable state at module level
