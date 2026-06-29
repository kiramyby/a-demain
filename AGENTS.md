# Agent Instructions

## Documentation Entry Point

For repository work, read [CONTEXT.md](CONTEXT.md) first, then [docs/architecture/README.md](docs/architecture/README.md).

Use [docs/architecture/README.md](docs/architecture/README.md) as the architecture landing page. Only open linked topic pages when the task needs that level of detail.

[README.md](README.md) is the onboarding and setup entry point.

[docs/superpowers/specs](docs/superpowers/specs) and [docs/superpowers/plans](docs/superpowers/plans) are historical records. Do not use them as current implemented system facts.

When code and documentation disagree, code and observed behavior in `src/` win. Update the current architecture docs when changing implemented behavior.

## Architecture Docs Scope

Architecture docs record current implemented system facts only.

Do not add future plans, task breakdowns, or proposed designs to [docs/architecture](docs/architecture).

Keep documentation progressively disclosed: entry pages stay short, and detailed facts live in the narrowest matching topic page.

## External Library Documentation

Use Context7 MCP to fetch current documentation whenever a task depends on a library, framework, SDK, API, CLI tool, or cloud service.

Start with `resolve-library-id`, then use `query-docs` with the selected library id.

Do not use Context7 for refactoring, scripts from scratch, business logic debugging, code review, or general programming concepts.
