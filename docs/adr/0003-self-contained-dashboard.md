# 3. One self-contained dashboard file with relative media paths

Status: accepted, extended by [ADR 5](0005-live-index.md)

## Context

People open the dashboard from Finder or Explorer, from Claude's browser tool, or after zipping a project to share it. A local server or a CDN would add a moving part that breaks in at least one of those cases.

## Decision

`dashboard.html` is a single file with inline CSS, inline JavaScript, embedded data and logos as data URIs. Videos and posters load by relative path from `videos/` and `thumbs/` next to it. The client is real TypeScript, bundled with esbuild at build time and inlined by the generator.

## Consequences

- It works from `file://`, makes no network requests, and keeps working after the project folder moves.
- Each dashboard carries its own copy of the client (about 30 KB plus logos). Regenerating it after an upgrade picks up the new client.
- Copy to clipboard and downloads use fallbacks because some browsers restrict them on `file://`.
