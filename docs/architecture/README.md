# Architecture

Current as of 2026-06-30.

## What this layer is for

This directory records current implemented system facts for the repository.
Read [CONTEXT.md](../../CONTEXT.md) first for canonical language.

## Current system snapshot

This is an Astro 6 personal site. Blog publishing is a build-time path from Notion to the Astro `posts` collection and then to route pages. The `/friends` route page publishes active Friends from the Notion friends repository. The Notion server module currently has separate boundaries for blog posts, friends, and shared Notion infrastructure.

## Source-of-truth priority

1. Code and observed behavior in `src/` win; when docs drift, update the docs.
2. `docs/architecture/*` explains current implemented facts and does not carry future design.
3. `README.md` is the onboarding and setup entry point.
4. `docs/superpowers/specs/*` and `docs/superpowers/plans/*` are historical design and execution records.

## Current architecture pages

- [Blog content pipeline](./blog-content-pipeline.md) - Current implemented flow from Notion content to site routes.
- [Content model](./content-model.md) - Current blog post metadata and Astro collection schema.
- [Content rendering](./content-rendering.md) - Current Markdown retrieval, normalization, diagnostics, and rendered output.
- [Notion module boundaries](./notion-module-boundaries.md) - Current implemented boundaries inside `src/server/notion`.
- [Site routing](./site-routing.md) - Current implemented route surfaces and content collection exits.
