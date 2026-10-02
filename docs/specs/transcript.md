# Transcript parsing

`parseTranscript(text, durationSeconds)` in `packages/core/src/transcript` is pure: a string and the video's duration in, segments out.

## Accepted formats

The format is detected from the text, so the user never has to say which one they pasted.

1. **YouTube "Show transcript" paste.** Either a timestamp line (`0:00`, `1:23`, `1:02:45`) followed by one or more text lines, or the timestamp and text on one line (`0:03 hello there`). Text lines after one stamp are joined with a space.
2. **SRT.** Numbered blocks with `00:00:01,000 --> 00:00:04,000` timing lines.
3. **WebVTT.** Starts with `WEBVTT`. Cue identifiers, `NOTE` and `STYLE` blocks, cue settings (`align:start`), voice and class tags and inline timestamps are removed. YouTube's rolling auto captions repeat each line; a cue identical to the one before it is merged into it.

Detection: text starting with `WEBVTT` (after an optional byte order mark) is WebVTT; text containing an `hh:mm:ss,mmm -->` line is SRT; anything else is treated as a YouTube paste.

## What is ignored

Blank lines, transcript panel chrome (`Transcript`, `Search in video`, `Show transcript`, `Chapters`, `No results found`, language labels) and screen reader durations such as `2 minutes, 5 seconds`. Text before the first timestamp is dropped. Tags such as `[Music]` and `[Laughter]` are kept because they are useful cues when planning.

## Output

Segments are `{ start, end, text }` in seconds, sorted by start. For YouTube pastes `end` is the next segment's start, and the video's duration for the last segment. For SRT and WebVTT the cue's own end is used, capped at the video's duration.

Stats: segment count, first and last timestamp, video duration and coverage (last timestamp divided by duration).

## Warnings and errors

- If the last timestamp is more than 10% short of the video's duration, the result carries a warning that the paste is probably incomplete.
- No timestamped lines at all fails with `E_TRANSCRIPT_EMPTY` (exit 3).

The `transcript` command writes the parsed result to `work/transcripts/<video>.json` and prints the stats.
