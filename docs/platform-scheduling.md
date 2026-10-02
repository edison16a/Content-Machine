# Platform scheduling

Content Machine plans the calendar. Posting happens in each platform's own scheduler, either by you or by Claude driving your logged-in browser.

> **As of October 2026. Verify in your account.** Platforms change these limits often and they can differ by account, region and history. Nothing on this page was tested against the platforms by this project; it is a summary of their published behavior.

| Platform | Desktop scheduler | Account needed | How far ahead | Things to know |
| --- | --- | --- | --- | --- |
| TikTok | TikTok Studio upload page | Business or Creator account | About 10 days | Dates beyond the window are refused. Come back later for the rest. |
| Instagram Reels | Meta Business Suite | Professional (Business or Creator) account | Weeks ahead | Scheduling from the desktop goes through Business Suite, not instagram.com. |
| YouTube Shorts | YouTube Studio (upload, then Visibility: Schedule) | Any channel | No published limit | Every upload counts toward a daily upload limit even when scheduled for later. Upload about 6 to 9 per session. |

## How the playbook handles limits

- Upload in id order, one platform at a time, at the exact time in `plan/schedule.json` for that platform.
- When a scheduler refuses a date, stop that platform, leave the rest `queued`, and tell the user which date to come back.
- Never post immediately to get around a limit.
- After each success, `npm run cm -- mark <project> --item <id> --platform <platform> --status scheduled` keeps the dashboard in sync. Later, items that went live are marked `posted`.
