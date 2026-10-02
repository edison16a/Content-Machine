# Dashboard

The dashboard is the one place to see what posts when, and to watch every video with sound. The same client runs in two pages:

| Page                                 | What it shows | How it gets data                                     |
| ------------------------------------ | ------------- | ---------------------------------------------------- |
| `index.html` at the repo root (live) | every project | rereads `projects/dashboard-data.js` every 4 seconds |
| `projects/<name>/dashboard.html`     | one project   | baked in, a snapshot you can zip and share           |

## The live index

- `index.html` is committed and static. It exists from the moment you clone, and nothing ever rewrites it. Before setup it says how to set up; after `npm install` builds the client it shows the calendar.
- It loads the client from `packages/dashboard/dist/client/` and its data from `projects/dashboard-data.js`, a script that assigns `window.__CONTENT_MACHINE__ = { build, updatedAt, projects }`.
- Every command that refreshes a project's `dashboard.html` also rewrites that data file from **every** project's schedule. Media paths in it are prefixed with `projects/<name>/`. A project with a broken file is left out with a warning.
- The page polls by adding a fresh `<script src="projects/dashboard-data.js?v=…">`. Browsers block `fetch()` on `file://`, but script tags still load, so no server is needed. When the projects differ from last time the page redraws in place: the selected tab, week and open video stay put. If the open video was removed, the player closes.
- `build` is a fingerprint of the client bundle. When it changes between polls, the page reloads once to pick up the new client (guarded so it cannot loop).
- **All projects on one calendar** is the default. Every project's videos share the calendar and the statistics. The combined view's slot rows are every distinct slot time across projects, in order, and each video sits on the row of its own time; when two projects post in the same slot, both cards show. Settings that must be single (time zone, week start, logos) come from the project updated most recently. Items and readings are told apart by a key, `<project>#<id>`, so numbers that repeat across projects never collide; the picker in the statistics names each video's project.
- **Settings** (the gear in the header, top right) holds a custom dropdown to show one project instead: "All projects" (automatic, the default) first, then each project with its first video's poster, its channel and its video count. Picking one jumps the calendar to that project's videos. The choice is remembered (under a new storage key, so an older remembered pick does not carry over). `#project=<name>` in the address also picks one. A project's own `dashboard.html` always shows just that project.
- With no projects yet it still shows the whole dashboard: an empty calendar saying "No projects yet", zeroed statistics with empty graphs, and the platform tabs. It keeps polling, so everything fills in on its own.

## Tabs

All, TikTok, Instagram and YouTube. The choice is remembered.

- **All** shows the same calendar, but each card carries all three platforms' logos with a status dot each, and slot times are the base times (the platforms post minutes apart). The stats panel is hidden there. The Post now strip lists due posts from every platform, each labeled with its platform.
- **A platform** shows the stats panel, the week calendar and that platform's times, statuses and captions.

## Custom numbers (admin panel)

Clicking the Settings gear three times within about a second opens a hidden admin panel. It is a convenience, not a lock: nothing is protected and nothing leaves the browser.

- **Total views** accepts `30000`, `30,000`, `30k` or `1.5M`.
- **Split:** a slider per platform. The shares are the sliders' relative weights, shown as percentages, with each platform's views and estimated income (rates from config, six decimals) and the total income, all updating as you type or slide.
- **Show these numbers** saves them in this browser for the current selection (all projects, or the one picked) and closes the panel. The statistics then use them as the newest point, "now": tiles show them, each graph ends on them, and history stays as recorded. Views and income follow the typed numbers for the tab on screen; likes, comments and shares carry on from the last real reading. A "Custom numbers" label shows next to the heading. They apply only when the picker is on All videos.
- **Use recorded numbers** removes them. Escape, the close button or a click outside closes without saving.
- The form starts from the saved numbers, or else from the recorded totals and their split (half TikTok, a quarter each for the others when nothing is recorded yet).

## Statistics

A section under the calendar (or the video grid) on every tab, scoped to that tab's platform (or all of them):

- **Heading** with when it was last read and a **Refresh** button. The data is reread when you press it, every minute on its own, and whenever you switch tabs. While a press is rereading, the button's icon spins and its label reads "Refreshing" for at least 0.7 seconds (a gentle pulse instead when the system asks for reduced motion).
- **One row of filters:** a chip per metric (Views, Income, Likes, Comments, Shares) choosing which graphs show (remembered), a video picker, and a Show table toggle. The picker is a button that opens a panel with a search box and a list of every video (poster, number, title). Typing filters by every word in any order; "#3" matches video 3 exactly. Arrow keys move, Enter picks, Escape or a click outside closes. Background refreshes update the list without closing it.
- **Tiles:** views with an eye icon, estimated income in dollars to six decimals, likes, comments and shares.
- **Graphs:** one card per chosen metric, two per row (one on narrow screens), each a 2px line with a 10% wash, round y-axis ticks from zero, the first and last date, and an end dot. Hovering or arrow keys move a crosshair that snaps to the nearest reading, with a tooltip showing the value and time.
- **Table view:** every reading time, newest first, with a column per chosen metric.
- With nothing recorded, the tiles show zeros and each graph still draws its frame: gridlines, a zero baseline, the last week along the bottom and "No readings yet" in the middle. The table shows its header and a "No readings yet" row.
- While test data is on, a "Test data" label sits next to the heading and every number comes from the test data.

Each metric has one color, used for its icon, chip key and graph only: views blue, income green, likes pink, comments amber, shares violet, with separate steps for light and dark. The set was run through a color blind and contrast check on the panel color in both themes. Values and labels stay in the text colors.

## Post now

A strip above the calendar listing queued posts whose time has come, oldest first, each with when it was due and how long ago. Click one to open it. It is redrawn every 15 seconds (the whole page when the date rolls over) and is hidden entirely when nothing is due. On the All tab it covers every platform and names each one.

## One self-contained snapshot

- Inline CSS and JavaScript (the client is TypeScript bundled with esbuild at build time), the schedule data as escaped JSON, and the logos as data URIs.
- Videos and posters load by **relative path** from `videos/` and `thumbs/` next to the file, so the whole project folder can be moved as one unit.
- No network requests, no CDN, no web fonts (system font stack). It works from `file://`.
- It is regenerated by every command that changes what it shows. Never edit it, `index.html` or `projects/dashboard-data.js` by hand.

## Design rules

Minimal and calm: one accent color (the Content Machine green, `#35AA0E`) plus black, white and grays. Rounded corners (14px cards), no gradients, no decorative effects, no outlined buttons: buttons are solid and borderless, icon buttons are bare until hovered. The only motion is the tab underline sliding to the active tab and the Refresh icon spinning while it works. **Dark mode is the default.** A light mode toggle sits in the header and the choice is remembered.

Text is kept to what you need to act. No project names, channel links, handles or counts on the tabs.

## Layout

- **Header:** the Content Machine logo and name, a theme toggle and a "View on GitHub" button with the GitHub mark.
- **Stats:** one panel for the selected platform with Videos, Posted, Scheduled, Queued and Failed as large numbers, "Next up" on the right, and a progress bar underneath (posted in the accent, scheduled in a lighter accent).
- **Platform tabs:** TikTok, Instagram and YouTube with their official logos. The selected tab switches every time, status and caption to that platform. The choice is remembered.
- **Calendar navigation:** a Day, Week and Month switch (Week by default, the choice is remembered), previous and next by one day, week or month, the period's title ("Friday, October 2, 2026", "Sep 28 to Oct 4, 2026" or "October 2026"), Today and First unposted. The first day of the week comes from the project. Left and right arrow keys step through periods when no video is open and no control has focus.
- **Week view:** seven day columns with weekday, date and a Today marker. Each day shows its slots with their time for the selected platform. A slot holds a card (9:16 poster with a play mark, the post title and its status) or an empty dashed placeholder.
- **Day view:** one day, wide, with its slots side by side and large posters.
- **Month view:** a grid of whole weeks with weekday headings. Each day shows its videos as small posters with status dots (three on the All tab); days from the neighbouring months are dimmed and today is outlined. Clicking a date opens that day in the day view; clicking a poster plays it.
- **Hover preview:** on devices that can hover, resting on a card for 400ms plays a silent preview in place. One at a time.

Statuses are a small dot and one word: queued is a gray dot, scheduled an accent ring, posted a solid accent dot, failed a bold word with a light dot.

## Player

Clicking a card opens a modal with a real `<video>` (`controls`, `playsinline`, poster, `preload="metadata"`) that starts playing **with sound** right away; the click is the user gesture. If the browser still blocks it, a large play button appears.

Beside the video, kept short: the post title, when it posts on the selected platform, that platform's caption with a copy button, all three platforms with logo, time and status, and two actions: "Open folder" and "Copy file path" (an absolute path worked out from the page's location). Open folder opens the folder holding the video in a new tab; browsers do not let a page open Finder or Explorer, so this is the closest a page can get, and the copied path pastes straight into Finder's Go to Folder.

- There is no previous or next button and no auto-play: a video plays once and stops.
- **Keyboard:** Space play or pause, M mute, F fullscreen, Esc close.
- Volume and mute are remembered. Closing pauses the video and releases it. Only one video plays anywhere on the page.
- A file that fails to load shows: "Video not found. Keep dashboard.html in the project folder next to the videos folder."

## Responsive and accessible

Seven columns on wide screens; a list of days below 1100px; one column and a full-screen player on phones. Cards are buttons with descriptive labels, focus is always visible, images have alt text and the palette keeps text contrast high. `localStorage` is wrapped in try/catch so blocked storage never breaks the page.
