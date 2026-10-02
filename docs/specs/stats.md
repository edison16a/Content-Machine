# Statistics

Views, likes, comments and shares per video per platform, kept locally, totalled and graphed on the dashboard with an estimated income. Matching lives in `packages/core/src/stats`, the totals and timeline math in `packages/dashboard/src/shared/stats.ts`, and the command in `packages/cli/src/commands/stats.ts`.

## Where the numbers come from

Nothing is fetched automatically. Claude reads each platform's analytics in the user's logged-in browser (`playbook/steps/09-stats.md`), or the user types them in, and the `stats` command records them. The dashboard's Refresh button, its one minute timer and switching tabs all reread the local data file; none of them contact a platform.

## Storage

`plan/stats.json` (schema `stats`) holds every reading ever recorded, oldest first. Each reading has `at`, `platform`, `itemId`, the `title` as the platform showed it, and `views`, `likes`, `comments`, `shares` (totals so far, whole numbers). Readings are only appended, never edited, so the file is the history the graphs draw.

## Recording

```
npm run cm -- stats <project> --platform tiktok --title "<as shown>" --views 1200 [--likes] [--comments] [--shares] [--item <id>] [--posted-on YYYY-MM-DD]
npm run cm -- stats <project> --import <file.json>
npm run cm -- stats <project>
```

The import file is an array of rows (schema `stats-import`): `platform`, `views`, optional `likes`, `comments`, `shares`, `at`, and either `item` or `title`, plus `postedOn` to tell apart Sequential parts. A missing count is 0. Any reading flag means "record"; the bare command prints totals. A write happens under a lock and then both dashboards are refreshed.

## Matching by name

Titles and captions are normalized first: accents, emojis, hashtags, mentions, punctuation and case are dropped. A recorded title is compared with each video's post title and that platform's caption, and the best tier wins:

| Tier | Rule                                                                        |
| ---- | --------------------------------------------------------------------------- |
| 3    | identical after normalizing                                                 |
| 2    | one is a prefix of the other, at least 12 characters (platforms cut titles) |
| 1    | at least 3 words, and 80% of them appear in the candidate                   |

If several videos tie (Sequential parts share a title), `postedOn` keeps the ones posted that day on that platform. One survivor is a match. Otherwise the row is reported as unmatched or ambiguous, with the tied ids, and nothing is recorded for it. An explicit `item` skips matching but must exist.

## Totals over time

Each reading replaces the previous reading for the same video on the same platform. A point on the timeline is the sum of the latest reading of every video at that moment; readings with the same `at` form one point. The totals shown are the last point. Filters (a platform or All, one video or all) apply before summing.

## Test data

`npm run cm -- testdata <project> on|off [--income <dollars>] [--views <n>] [--days <n>]` (defaults: $30,000, 30 days). On writes `plan/sample-stats.json` (schema `stats`) from `sampleSnapshots` in `packages/core/src/stats/sample.ts`: the target (dollars, or views with `--views`) is split randomly across platforms and videos; a dollar target becomes views through each platform's rate (a platform with rate 0 uses $0.05 for its views). Each video starts on a random day in the first 60% of the window, with one reading per day. Its daily views are biggest at launch and fade into a long tail, vary day to day, and on about one day in eight something picks it up again: a bump several times the usual day that fades over a day or three. Running totals of those days are scaled to end exactly on the video's share. Likes, comments and shares are random typical shares of views. The randomness is seeded by the project name, so the same project always gets the same numbers. Amounts accept `30000`, `30,000` or `30k`.

While the file exists, the dashboard and `stats` show only the test data (mixing it with real readings for the same videos would make meaningless totals), with `sample: true` in the dashboard data and a "Test data" label. Off deletes the file. `plan/stats.json` is never touched by either.

## Income estimate

`views / 1000 × rate`, per platform, summed. Rates are US dollars per 1,000 views in `config/defaults.json` under `rates`, overridable in `config/local.json`. Defaults (October 2026):

| Platform  | Rate  | Why                                                                                   |
| --------- | ----- | ------------------------------------------------------------------------------------- |
| TikTok    | $0.40 | low end of Creator Rewards ($0.40 to $1.00+); videos under a minute usually earn less |
| YouTube   | $0.07 | Shorts RPM is about $0.02 to $0.13                                                    |
| Instagram | $0.01 | Reels pay nothing for most creators; bonuses, when active, are $0.01 to $0.12         |

It is shown with six decimals everywhere. It is an estimate for motivation, not accounting.
