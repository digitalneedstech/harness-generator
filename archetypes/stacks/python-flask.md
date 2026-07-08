---
paths:
  - "**"
---

# Python / Flask Stack Rules

## Build and test commands

Test: `{{test_command}}`
Single test: `python -m pytest tests/path/test_file.py::test_name -v`
Coverage: `python -m pytest --cov`

## Conventions

- Use the application factory pattern (`create_app()`) for Flask initialization
- Organize routes into Blueprints by domain
- Use Flask-SQLAlchemy for database access — no raw SQL strings
- Load configuration from environment variables via `python-dotenv`
- Return JSON responses using `flask.jsonify()` or `flask.Response`

## Guardrails

- Do not import the `app` object directly inside blueprints — use `current_app` proxy
- Do not store mutable state at module level
- Do not use bare `assert` for validation — use explicit checks with `flask.abort()`
