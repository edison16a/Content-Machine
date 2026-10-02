# 4. A pure core package

Status: accepted

## Context

The rules that matter most (plan validation, snapping, layout, scheduling, statuses) are easy to get subtly wrong, and bugs there publish wrong videos at wrong times.

## Decision

Put all of that in `@content-machine/core`, which may not import filesystem, process, OS or network modules, may not read the clock, and may not depend on any other package. Side effects go through the `FileSystem`, `ProcessRunner` and `Clock` interfaces, implemented in `render`. Lint and an architecture test enforce the boundary.

## Consequences

- Core has fast, exhaustive unit tests with a 90% coverage floor.
- Edge packages stay thin and are covered by integration tests against real ffmpeg and a real browser.
- New features sometimes need a small port or an extra parameter instead of a quick `readFile`, which is the point.
