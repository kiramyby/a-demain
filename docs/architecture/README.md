# Architecture

Current as of 2026-06-18.

## What this layer is for

This directory records current implemented system facts for the repository.
The current coverage is intentionally narrow and only documents the blog content pipeline so far.

## Source-of-truth priority

1. Code and observed behavior in `src/` win; when docs drift, update the docs.
2. `docs/architecture/*` explains current implemented facts and does not carry future design.
3. `README.md` is the onboarding and setup entry point.
4. `docs/superpowers/specs/*` and `docs/superpowers/plans/*` are historical design and execution records.

## Current architecture pages

- [CONTEXT.md](../../CONTEXT.md) - Read first for canonical language.
- [Blog content pipeline](./blog-content-pipeline.md) - Current implemented flow from Notion content to site routes.
