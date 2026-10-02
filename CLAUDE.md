# Content Machine: instructions for Claude

If the user says **"Using Content Machine: <link>"** or **"Use Content Machine to help me create a video"**, asks to make or schedule short videos with this repo, or says "start Content Machine", **read `playbook/run.md` now and follow it.**

If you are working on the codebase itself (fixing bugs, adding features), follow this instead:

- Architecture: `docs/architecture.md`. Dependencies point one way: `cli` uses `render` and `dashboard`, and both of those use `core`. `core` is pure (no fs, clock or processes). Don't break it; lint and `test/architecture.test.ts` enforce it.
- Before finishing any change run `npm run check`. Add or update tests. Never use `any`.
- All JSON on disk is defined by zod schemas in `packages/core/src/schemas`. Change the schema, then run `npm run docs:schemas`.
- Specs live in `docs/specs/`. Update the spec and the code together.
- Never add a video downloader. Never process audio. Never hand-edit `plan/schedule.json` or `dashboard.html`; use the CLI.
