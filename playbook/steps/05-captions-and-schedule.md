# Step 4: captions and schedule

Write `plan/metadata.json` for every rendered item (only the new ones when appending):

```json
{
  "schemaVersion": 1,
  "items": [{ "id": 1, "postTitle": "…", "captions": { "tiktok": "…", "instagram": "…", "youtube": "…" } }]
}
```

- **Post title.** Sequential: the video title as-is on every post, no part numbers. Clip: that clip's title. YouTube titles under 100 characters, written like search-friendly keywords, not just a hook.
- **Caption order (same structure every time):** required hashtags, mentions and disclosures from the brief first; then one short line of context; then a credit line ("Credit: <channel>") unless the brief specifies other wording; then the hashtags.
- **Hashtags are a weak lever; keep them few and specific:** TikTok 3 or 4 niche tags, Instagram 3 to 5, YouTube 2 or 3 (in the description). Name the topic, the creator or the niche. No #fyp or #viral. Vary the wording a little across platforms but keep the structure the same.

Then run `npm run cm -- schedule <project>`. The tool gives every unscheduled item a fixed slot (3 a day at the times in `project.json`, with TikTok, Instagram and YouTube staggered), queues overflow into later days and weeks, and regenerates the dashboard. Don't move items yourself.

Write `plan/report.md`: the plan table (id, source timestamps, note or score, title), the brand settings used, anything flagged (hard cuts, incomplete transcript, accent change), and the first and last scheduled date.
