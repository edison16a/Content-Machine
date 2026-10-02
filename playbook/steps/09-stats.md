# Step 8: update statistics

Do this when the user says "update my stats", "refresh stats", "how are my videos doing" or similar, and at the end of step 7 when coming back later. The dashboard's statistics only show what is recorded here: its Refresh button rereads the local file, it cannot reach TikTok, Instagram or YouTube itself.

## Read the numbers

Use the user's logged-in browser. Never ask for or type passwords.

| Platform  | Where                                                                    | What each post shows                        |
| --------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| TikTok    | TikTok Studio, Posts (or open each post's analytics)                     | the caption, views, likes, comments, shares |
| Instagram | Meta Business Suite, Content, or each Reel's insights                    | the caption, plays, likes, comments, shares |
| YouTube   | YouTube Studio, Content, Shorts tab (add the Likes and Comments columns) | the title, views, likes, comments           |

Only read posts that belong to this project (they carry its titles and credit line). Write down numbers exactly as shown; turn "12.4K" into 12400 only when the exact number is not available anywhere (hovering often shows it).

## Record them

Write one JSON file per update, for example `projects/<project>/work/stats-<YYYY-MM-DD>.json`:

```json
[
  {
    "platform": "tiktok",
    "title": "MrBeast $10 Million Puzzle",
    "postedOn": "2026-10-02",
    "views": 12400,
    "likes": 980,
    "comments": 41,
    "shares": 77
  },
  { "platform": "youtube", "item": 3, "views": 5210, "likes": 300, "comments": 12 }
]
```

- `title` is the post's title or caption as the platform shows it. The tool matches it to the right video by name, so a cut-off title or a caption with hashtags is fine.
- Sequential parts all share one title, so always add `postedOn` (the day it went up) for them. If you can tell which video it is for certain, `item` (its id) skips matching.
- Leave out a number the platform doesn't show; it counts as 0.

Then run:

```
npm run cm -- stats <project> --import projects/<project>/work/stats-<YYYY-MM-DD>.json
```

It prints which rows it recorded and which it could not place. For each "no video matches" or "fits items 4, 5", check the post and fix the row (add `postedOn` or `item`), then import only the fixed rows again. Never guess an id.

## Test data

To try the statistics before there are real numbers, `npm run cm -- testdata <project> on` writes 30 days of made-up readings (adding up to about $30,000 across the platforms, split randomly) to `plan/sample-stats.json`. Change it with `--income 5k`, `--views 30000` or `--days 14`. While it is on, the dashboard shows only the test data with a "Test data" label, and `stats` says so. `npm run cm -- testdata <project> off` deletes it; real readings are never changed. Turn it off before recording real numbers so the user sees them.

## Tell the user

In two or three lines: total views per platform, the estimated income (it is an estimate from the rates in `config/defaults.json`, overridable in `config/local.json`), and which videos are doing best. Their open `index.html` picks up the numbers within a few seconds.
