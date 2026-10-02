# Step 2 (Sequential): plan the cuts

Read the whole transcript, then divide it into consecutive parts and write `plan/plan.json` (schema: `docs/specs/plan.md`, `docs/schemas/plan.schema.json`).

- **Length varies on purpose.** Each part is at most 60 seconds (never more), usually 35 to 60s. A punchy beat can be shorter, but not under 20s except possibly the last part. Never cut at a fixed interval.
- **Cut at story beats:** the end of a scene or step, right after a payoff or punchline, right before a reveal, a decision or a cliffhanger, or at a clear topic shift. Prefer ending a part on tension so people want the next one. Each part should feel like a small chapter.
- **Never cut mid-sentence or mid-thought.** Every part starts at the start of a sentence. The first part opens with the premise.
- **Cover everything.** The first part starts at 0; the last part ends at the video's actual end; each part starts exactly where the previous one ends. Don't skip any section.
- Use the transcript timestamps for boundaries. They're approximate; the tool snaps them to the nearest pause in the audio.
- Every part has the same title (the user's video title) and the same accent word: one number, name or key noun from the title. Use the brand accent color from `config/defaults.json`; change it only if the blurred background makes it hard to read, and say so in the report.
- Parts are not clips: don't hunt for highlights or reorder anything. There is no limit on how many parts; they queue into later days.
- Give every item a stable integer `id` (continuing from the highest existing id when appending) and a short `note` saying why you cut there.
