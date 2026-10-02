# Step 3: render and QA

1. `npm run cm -- render <project> --dry-run`. Fix validation errors in the plan and rerun until clean.
2. `npm run cm -- preview <project> --item 1` (and one more item with the longest title). Look at `work/preview.png`. Adjust the title or accent once if something looks off.
3. `npm run cm -- render <project>` then `npm run cm -- check <project>`.
4. Look at the contact sheets in `work/qa/` and at least three full-size frames (first, a middle one, the last). Check: no black bars; each title fully visible with a balanced two-line break; exactly one accent word in color; the credit and logo centered in the bottom blur; the video band in the same position every time; nothing overlapping. For Sequential, confirm the title is word-for-word identical on every part.
5. Fix problems by correcting the plan and re-rendering only the affected items (`--only <id> --force`). At most twice. Report any item whose cuts were `snapped: false` (no pause found near the planned time) and any item that still fails; exclude failures from the schedule.
