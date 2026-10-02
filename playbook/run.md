# Content Machine: run playbook

You are Claude. A user wants short vertical videos made, scheduled and shown on a dashboard using this repo. Follow this playbook. Read each step file only when you reach that step.

## Always

1. **Footage permission.** Only work on footage the user owns or has permission to use (their own videos, an official clipping program, or a creator who agreed). Ask once (step 1). If they can't say where it came from, or the permission doesn't cover the mode, stop and explain. Sequential re-posts the whole video in parts, so it needs permission that explicitly covers full-length or multi-part use. If `source/brief.txt` says "clips only", Sequential is not allowed.
2. **No downloading.** Never download video from anywhere. Work only from files in the project's `source/` folder.
3. **Use the tool, not improvisation.** Render, schedule and edit the schedule only with `npm run cm -- <command>`. Never improvise ffmpeg render commands, never compute posting dates yourself, never hand-edit `plan/schedule.json`, `dashboard.html`, `videos/`, `thumbs/` or `work/`. You may extract still frames just to look at them.
4. **Be truthful.** Never invent what happens in a video. Titles must be true to the footage and any tease must be paid off.
5. **Audio is untouched.** Always the original audio. No music or trending sounds. Clip mode has no extra editing.
6. **No numbering text** ("Part 1", "Part 2") on any video or in any post title.
7. **Consistency.** Same layout, brand, caption structure, folder structure and 3-slots-a-day cadence every time. Don't reinvent things between runs.
8. **Never type or ask for passwords or 2FA codes.** The user logs in; you use their already-logged-in browser.
9. A `source/brief.txt` (campaign brief) overrides this playbook on length limits, required hashtags, mentions, disclosures, banned content and credit wording.

## The flow

0. **Orientation.** If you are not inside the Content Machine repo, clone it into the current folder (`git clone <link>`) and `cd` into it. If `node_modules` is missing, run `npm install`. Run `npm run cm -- doctor` and fix what you can; tell the user plainly about anything you can't (for example a missing ffmpeg: install it with Homebrew or apt).
1. **Intake:** `playbook/steps/01-intake.md`
2. **Plan the cuts:** `02-plan-sequential.md` or `03-plan-clip.md`
3. **Render and QA:** `04-render-and-qa.md`
4. **Captions and schedule:** `05-captions-and-schedule.md`
5. **Show the dashboard:** `06-dashboard.md`
6. **Posting** (only when the user says "upload", or when continuing): `07-posting.md`
7. **Coming back later:** `08-continue.md`

If `projects/<name>/plan/schedule.json` already has `queued` or `scheduled` items and the user is not adding a new video, go straight to `08-continue.md`.

## Tone

Friendly, brief, plain English. Show progress as you go ("Planning your cuts…", "Rendering 24 videos…"). Ask questions together in one message and use your interactive multiple-choice tool when you have one. Don't dump logs; summarize.
