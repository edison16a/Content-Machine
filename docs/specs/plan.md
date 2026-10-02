# Plan format and validation

`plan/plan.json` holds the cut decisions. Claude writes it; the tool validates it before every render.

## Format

```json
{
  "schemaVersion": 1,
  "mode": "sequential",
  "accentColor": "#FF8A1F",
  "sources": [
    {
      "file": "video1.mp4",
      "channel": "Example Channel",
      "platform": "youtube",
      "title": "How We Built A Tiny House In 30 Days",
      "accent": "30 Days"
    }
  ],
  "items": [
    { "id": 1, "source": "video1.mp4", "start": 0.0, "end": 47.3, "note": "premise" },
    { "id": 2, "source": "video1.mp4", "start": 47.3, "end": 98.1, "note": "first reveal" }
  ]
}
```

- `sources[].file` is a plain file name inside `source/`. Names with folders or dot segments are rejected, which is what stops a plan from reading files elsewhere.
- **Sequential:** title and accent live on the source and never vary between its parts. Items must not carry their own `title` or `accent`.
- **Clip:** every item carries its own `title` and `accent`, and may carry its own `accentColor`.
- `accentColor` defaults to `#FF8A1F`.

## Ids are permanent

`id` is a unique integer, ascending in posting order, and it names the output (`videos/001.mp4`). Plans grow by appending items with new ids. Once an item is rendered, its cut and text are frozen: the render log stores a plan key (source, start, end, title, accent, accent color) for every rendered item. Changing or removing a rendered item fails with `E_PLAN_LOCKED` unless `render --force` is used. Scheduled items are always rendered items, so they are covered too.

## Validation rules

Every problem is reported at once, each with its item id, as a `ValidationError` (exit 3). When all problems share one code (for example `E_PLAN_GAP`) that code is used; otherwise `E_PLAN_INVALID`.

| Rule                                                                                                                                                   | Code                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Ids unique and ascending                                                                                                                               | `E_PLAN_INVALID`                     |
| Each source listed once and present in `source/`                                                                                                       | `E_PLAN_INVALID`, `E_FILE_NOT_FOUND` |
| Items reference a listed source                                                                                                                        | `E_PLAN_INVALID`                     |
| `start < end`, and `end` within the source (0.05s slack)                                                                                               | `E_PLAN_DURATION`                    |
| Every item at most **59.98 seconds**                                                                                                                   | `E_PLAN_DURATION`                    |
| At least 8 seconds (Sequential parts under 20s get a warning)                                                                                          | `E_PLAN_DURATION`                    |
| Sequential, per source: first part starts at 0, each part starts where the previous ended (0.01s slack), the last ends within 0.5s of the source's end | `E_PLAN_GAP`, `E_PLAN_OVERLAP`       |
| Clip, per source: clips do not overlap                                                                                                                 | `E_PLAN_OVERLAP`                     |
| The accent is a word or run of consecutive words in the title, ignoring case and punctuation                                                           | `E_PLAN_INVALID`                     |

59.98 rather than 60 because platforms treat a video that rounds to 60.0 seconds as "over a minute".
