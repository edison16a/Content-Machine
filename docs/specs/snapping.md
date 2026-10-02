# Snapping cuts to audio

Transcript timestamps are approximate, often off by a second or two. Before rendering, every cut is moved onto the nearest pause in the audio so no video starts or ends mid-word.

## Finding pauses (`packages/render/src/probe/silence.ts`)

`render` runs ffmpeg's `silencedetect` twice per source, at `noise=-35dB:d=0.3` (real pauses) and `noise=-30dB:d=0.18` (breaths between sentences), and merges the two lists into sorted, non-overlapping intervals. This is analysis only; it never touches output audio. Results are cached in `work/cache/` keyed by the file's path, size and modification time.

## Snapping (`packages/core/src/snap`, pure)

For each boundary, only pauses within `--snap-window` seconds (default 2) count. Each pause gives one candidate cut time depending on the kind of boundary, and the candidate nearest the planned time wins:

| Boundary | Cut lands at |
| --- | --- |
| Clip start | pause end minus 0.1s (just before speech resumes) |
| Clip end | pause start plus 0.2s (just after speech stops) |
| Sequential boundary shared by two parts | the pause's midpoint, used as the end of one part and the start of the next |

Sequential parts also pin their outer edges: the first part starts at exactly 0 and the last ends at the source's true duration, so parts always tile the whole video.

If no pause is in the window, the planned time is kept and the side is marked `snapped: false`. `render` lists those items so they can be checked in the preview.

## Re-checking lengths

After snapping, any item over 59.98s has its end pulled back to the latest earlier candidate in the window that makes it fit (in Sequential mode the next part's start moves with it). If none fits, or an item ends up under 8 seconds, snapping fails with `E_SNAP_FAILED` naming each item. The final times are written to `work/render-log.json`.

## autoplan (no transcript)

`autoplan` splits a whole video into Sequential parts at pause midpoints:

1. While more than 59.98s remain, cut at the latest pause midpoint that makes the part 52 to 59.98s long. If there is none, widen to 35s. If there is still none, hard cut at 59.5s and flag the part.
2. If the final part would be under 15s, merge it into the previous one when the total stays at or under 59.98s; otherwise re-split the last two parts near their shared midpoint, preferring a pause.

New parts are appended to the plan with the next ids and a note saying whether each cut is on a pause or a hard cut.
