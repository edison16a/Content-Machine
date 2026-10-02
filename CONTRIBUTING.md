# Contributing

Thanks for helping. This page covers setup, the rules the code follows, and how to send a change.

## Setup

Requirements: Node 20 or newer (22 recommended, see `.nvmrc`), ffmpeg with libx264, and Google Chrome for the dashboard browser tests.

```bash
git clone https://github.com/edison16a/Content-Machine.git
cd Content-Machine
npm install          # also builds every package
npm run cm -- doctor # checks ffmpeg, the font, Chrome and logos
npm run check        # lint, typecheck, build, unit and integration tests
```

Browser tests need the demo project:

```bash
npm run demo
npm run test:e2e
```

## Rules the code follows

- **Dependency direction.** `cli` uses `render` and `dashboard`; those use `core`; `core` uses nothing else and stays pure (no filesystem, processes, network or clock). Lint and `test/architecture.test.ts` enforce it. See [docs/architecture.md](docs/architecture.md).
- **Strict TypeScript.** No `any`, no default exports in packages, named exports only.
- **Small files.** Aim for functions under 50 lines and files under about 200. Explain non-obvious code with a comment that says why.
- **Schemas first.** Every JSON file on disk has a zod schema in `packages/core/src/schemas`. After changing one, run `npm run docs:schemas` and commit the result (CI fails on drift).
- **Specs and code move together.** If you change behavior described in `docs/specs/`, update the spec in the same pull request.
- **Never** add a video downloader, process audio, or hand-edit generated files (`plan/schedule.json`, `dashboard.html`).
- **Writing style** for docs and UI text: short sentences and plain words. No em dashes or arrows standing in for words.

## Tests

- Pure logic gets unit tests. `core` keeps at least 90% coverage.
- Anything that runs ffmpeg gets an integration test on synthetic video (skipped when ffmpeg is missing).
- Dashboard behavior gets a Playwright test in `packages/dashboard/e2e`.

## Commits and pull requests

- Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ci:`), one logical change per commit.
- Run `npm run check` before pushing.
- Fill in the pull request template, including what you tested.

By contributing you agree that your work is released under the [MIT License](LICENSE) and that you follow the [Code of Conduct](CODE_OF_CONDUCT.md).
