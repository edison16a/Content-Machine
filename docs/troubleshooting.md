# Troubleshooting

Run `npm run cm -- doctor` first. It checks Node, ffmpeg, libx264, the font, yt-dlp, Chrome and logos, and prints a fix for anything missing.

## ffmpeg is missing (`E_FFMPEG_MISSING`, exit 4)

Install it: on macOS `brew install ffmpeg`; on Debian or Ubuntu `sudo apt install ffmpeg`. Both builds include ffprobe and libx264. Open a new terminal afterwards so it is on your `PATH`.

## yt-dlp is missing (`E_YTDLP_MISSING`, exit 4)

Only `fetch` needs it. On macOS `brew install yt-dlp`, on Windows `winget install yt-dlp.yt-dlp`, on Linux `pipx install yt-dlp`. Open a new terminal afterwards.

## A link will not download (`E_DOWNLOAD_FAILED`, exit 5)

The hint shows yt-dlp's own error. Most often the site changed and yt-dlp needs an update: `yt-dlp -U`, `brew upgrade yt-dlp` or `pipx upgrade yt-dlp`. Private, age restricted or members only videos cannot be fetched; download them yourself and copy the file into `source/`. On YouTube, "HTTP Error 403" from a cloud server or VPN usually means YouTube is blocking that network.

## The font does not load (`E_FONT_MISSING`, exit 4)

`assets/fonts/Poppins-ExtraBold.ttf` is missing or damaged. Restore it with `git checkout -- assets/fonts`. The renderer always uses this bundled file, never a system font.

## A title will not fit (`E_TITLE_TOO_LONG`)

The title cannot fit on two lines even at the smallest size. The error says roughly how many characters fit; shorten the title in `plan/plan.json`.

## The plan is rejected (`E_PLAN_GAP`, `E_PLAN_OVERLAP`, `E_PLAN_DURATION`)

Every problem is listed with its item id. In Sequential mode each part must start exactly where the previous one ends, the first at 0 and the last at the video's end. No item may exceed 59.98 seconds. See [the plan spec](specs/plan.md).

## A rendered item changed (`E_PLAN_LOCKED`)

Rendered items are frozen so published videos never change silently. Append a new item with a new id instead. To re-render on purpose: `npm run cm -- render <project> --only <id> --force`.

## index.html says "not set up yet" or stays empty

- "Not set up yet" means the client has not been built. Run `npm install` (or say "set up Content Machine" to Claude), then refresh the page once.
- "No projects yet" means there is no project or `projects/dashboard-data.js` has not been written. Any command that touches a project writes it, for example `npm run cm -- dashboard <project>`. The page picks it up within a few seconds.
- `index.html` must stay at the top of the Content Machine folder: it loads the client, the data and the videos by relative path from there.

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
