# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-10-02

### Added

- `core` package: zod schemas for every on-disk file, transcript parsing (YouTube paste, SRT, WebVTT), plan validation with append-only ids, snapping cuts to pauses, autoplan, layout and title fitting, a deterministic DST-safe scheduler with a cross-project ledger, and the posting status machine.
- `render` package: ffmpeg rendering with a blurred background, a fixed title block, canvas-drawn title and credit overlays, untouched audio, thumbnails, preview frames, QA checks and contact sheets.
- `dashboard` package: a single self-contained `dashboard.html` with platform tabs, a week calendar with three timed slots per day, hover previews, and a player that plays every video with sound, auto-plays the next one and supports keyboard controls.
- `cli` package: `doctor`, `new`, `transcript`, `render`, `preview`, `check`, `schedule`, `mark`, `dashboard`, `open`, `status`, `autoplan`, `demo` and `schema`, all with `--json`.
- The playbook Claude follows when a user says "Using Content Machine: <link>".
- Specs, architecture notes, ADRs, generated JSON Schemas, CI on Ubuntu and macOS, and community files.

[Unreleased]: https://github.com/edison16a/Content-Machine/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/edison16a/Content-Machine/releases/tag/v0.1.0
