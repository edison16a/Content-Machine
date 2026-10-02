# 5. A live index.html that reads a data script

Status: accepted

## Context

People want one dashboard tab they open once and never think about again. A regenerated `dashboard.html` per project means a different file for each project and a manual refresh after every change. The page must still work from `file://` with no server, because that is how most people open it (ADR 3).

On `file://`, browsers block `fetch()` and XHR, and ES module imports. A classic `<script src>` to a file in the same folder tree still loads.

## Decision

`index.html` at the repo root is a small committed page that never changes. It loads the bundled client from `packages/dashboard/dist/client/` and its data from `projects/dashboard-data.js`, a one line script that assigns every project's data to a global. The CLI rewrites that file (atomically) whenever a project's dashboard changes. The page reloads the script on a timer and redraws when the data differs.

The data carries a fingerprint of the client bundle so the page can reload itself after an upgrade.

The per-project `dashboard.html` from ADR 3 stays as a self-contained snapshot for zipping and sharing.

## Consequences

- One page for every project, findable next to the README, that stays current while it is open.
- The live index only works inside the repository folder, since it reads the client and media by relative path from there. Sharing still uses the snapshot.
- Rereading a small local file every few seconds costs nothing noticeable.
- `npm install` must have built the client before the page can show anything; until then it shows setup instructions.
