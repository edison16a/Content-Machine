# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `fetch` command: give it a video link and it downloads the video and its best captions with yt-dlp into `source/downloads/`, names the captions `<video>.transcript.txt`, and fills in the project's channel and platform.
- `index.html` at the repo root: one live dashboard for every project. It rereads `projects/dashboard-data.js` every few seconds, so it can stay open for good, and reloads itself after an upgrade.
- A live strip on the dashboard with the clock in the project's time zone, and posts due right now.
- `playbook/setup.md`, which Claude follows when you say "Set up Content Machine" on a fresh clone.
- `doctor` reports yt-dlp, and two new error codes: `E_YTDLP_MISSING` and `E_DOWNLOAD_FAILED`.
- `stats` command and `plan/stats.json`: record views, likes, comments and shares per video per platform, matched to videos by title (with the posting date for Sequential parts), from flags or an import file.
- A statistics section on the dashboard: totals with an estimated income to six decimals, color-coded graphs over time, metric chips, a per-video filter, a table view, and a Refresh button plus refreshes every minute and on tab change.
- An All tab before TikTok, with every video and its status on each platform.
- Payout rates per 1,000 views in config (`rates`), used only for the income estimate.
- `playbook/steps/09-stats.md`: how Claude reads each platform's analytics and records them.
- The demo records sample statistics so the graphs have data.

### Changed

- `render`, `check`, `preview`, `transcript` and `autoplan` find source videos in `source/downloads/` as well as `source/`.
- `open` opens the live `index.html`, and its project argument is now optional.
- The playbook accepts a video link at intake instead of a file and a pasted transcript.
- The TikTok logo is now the TikTok app icon.
- The live strip shows the clock and posts due now; the Live marker and the next post panel are gone.
- With no projects, the live index shows the full dashboard, empty, instead of a placeholder message.
- The playbook's clip and post titles now carry the whole video's context unless the moment's own title is strong on its own.
- The "no downloader" rule is replaced by "download only through `fetch`". The footage permission rule is unchanged.

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
