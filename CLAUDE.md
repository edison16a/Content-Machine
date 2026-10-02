# Content Machine: instructions for Claude

If the user says **"set up"**, "set everything up", "install", "get this working" or anything similar, or `npm run cm -- doctor` fails, **read `playbook/setup.md` now and follow it.**

If the user says **"Using Content Machine: <link>"** or **"Use Content Machine to help me create a video"**, pastes a video link, asks to make or schedule short videos with this repo, or says "start Content Machine", **read `playbook/run.md` now and follow it.** A video link goes to `npm run cm -- fetch`, which downloads it with yt-dlp.

If the user asks to **update their stats** or how their videos are doing, follow `playbook/steps/09-stats.md`.

If the user asks to **activate, turn on or try test data** (sample or fake stats), run `npm run cm -- testdata <project> on` for each project they mean (default: 30 days adding up to about $30,000; `--income 5k` or `--views 30k` to change it). "Turn off" or "remove test data" is `npm run cm -- testdata <project> off`. Test data replaces the real numbers on the dashboard while it is on and never changes them.

The dashboard to show the user is always `index.html` at the repo root. It reads `projects/dashboard-data.js` and updates itself, so they can keep one tab open.

If you are working on the codebase itself (fixing bugs, adding features), follow this instead:

- Architecture: `docs/architecture.md`. Dependencies point one way: `cli` uses `render` and `dashboard`, and both of those use `core`. `core` is pure (no fs, clock or processes). Don't break it; lint and `test/architecture.test.ts` enforce it.
- Before finishing any change run `npm run check`. Add or update tests. Never use `any`.
- All JSON on disk is defined by zod schemas in `packages/core/src/schemas`. Change the schema, then run `npm run docs:schemas`.
- Specs live in `docs/specs/`. Update the spec and the code together.
- Downloads go through `npm run cm -- fetch` only (yt-dlp, never re-encoding). Never process audio. Never hand-edit `plan/schedule.json`, `dashboard.html` or `projects/dashboard-data.js`; use the CLI. `index.html` at the root is a static page: keep it free of data.
