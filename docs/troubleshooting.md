# Troubleshooting

Run `npm run cm -- doctor` first. It checks Node, ffmpeg, libx264, the font, Chrome and logos, and prints a fix for anything missing.

## ffmpeg is missing (`E_FFMPEG_MISSING`, exit 4)

Install it: on macOS `brew install ffmpeg`; on Debian or Ubuntu `sudo apt install ffmpeg`. Both builds include ffprobe and libx264. Open a new terminal afterwards so it is on your `PATH`.

## The font does not load (`E_FONT_MISSING`, exit 4)

`assets/fonts/Poppins-ExtraBold.ttf` is missing or damaged. Restore it with `git checkout -- assets/fonts`. The renderer always uses this bundled file, never a system font.

## A title will not fit (`E_TITLE_TOO_LONG`)

The title cannot fit on two lines even at the smallest size. The error says roughly how many characters fit; shorten the title in `plan/plan.json`.

## The plan is rejected (`E_PLAN_GAP`, `E_PLAN_OVERLAP`, `E_PLAN_DURATION`)

Every problem is listed with its item id. In Sequential mode each part must start exactly where the previous one ends, the first at 0 and the last at the video's end. No item may exceed 59.98 seconds. See [the plan spec](specs/plan.md).

## A rendered item changed (`E_PLAN_LOCKED`)

Rendered items are frozen so published videos never change silently. Append a new item with a new id instead. To re-render on purpose: `npm run cm -- render <project> --only <id> --force`.

## A video will not play in the dashboard

- Keep `dashboard.html` in the project folder next to `videos/` and `thumbs/`. The page loads them by relative path; if you moved only the HTML file, you will see "Video not found".
- Some browsers block autoplay with sound. Click the big play button.
- Chromium builds without proprietary codecs (including Playwright's bundled Chromium) cannot play H.264 and AAC. Use Google Chrome, Safari, Edge or Firefox.

## A scheduler refuses a date

TikTok's desktop scheduler only accepts dates about 10 days ahead. Leave the rest `queued` and come back closer to the date. See [platform scheduling](platform-scheduling.md).

## "Upload limit reached" on YouTube

Uploads count toward a daily limit even when scheduled for later. Stop, leave the rest `queued`, and continue the next day.

## Another command is updating the schedule (`E_LOCKED`)

Two commands tried to change the schedule at once. Wait for the other to finish. If nothing is running, delete the `.lock` file named in the message.

## Windows

Windows is untested. Windows Subsystem for Linux (WSL) with ffmpeg installed may work.
