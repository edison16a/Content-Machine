# Rendering and QA

## One ffmpeg run per item

Arguments are always an array passed to `spawn`, never a shell string. Inputs:

0. The source, with `-ss <start>` before `-i` (frame accurate, because we re-encode).
1. The title PNG and 2. the credit PNG, looped at the source frame rate.
2. The band shadow PNG (band layouts only).
3. A silent `anullsrc` track, only when the source has no audio.

The filter graph: split the source; shrink, blur, darken and saturate the background at 270x480 and composite the shadow there; scale up; overlay the scaled foreground; overlay the title with a fade and an eased rise; overlay the credit with a fade; convert to `yuv420p`. Sources faster than 60 fps are capped at 60. The output is limited with `-t <duration>`.

**Video:** `libx264`, `-profile:v high`, CRF 18, preset `medium` (`--preset` changes speed and file size, not the look), `yuv420p`, `-movflags +faststart`. `--hw` uses `h264_videotoolbox` on macOS.

**Audio:** no processing of any kind. No `-af`, no loudnorm, volume, compressor or limiter. The original audio is encoded to AAC-LC at 256 kb/s at the source's own sample rate. It is always re-encoded rather than stream-copied, because a copied AAC stream can only be cut on its own frame boundaries and would drift from the video cut. Sources without audio get a silent track, since browsers expect one. Source metadata and chapters are dropped.

**Clip mode gets no extra editing:** no dead-air removal, zooms, sound effects or music.

Each item renders to `work/tmp/` and is renamed into `videos/NNN.mp4` only when ffmpeg succeeds.

## Thumbnails

After each render, the frame at 2.0s of the finished video becomes `thumbs/NNN.jpg`: 360x640, JPEG quality 80 (encoded with canvas so the quality value means what it says).

## Resuming

`work/render-log.json` records each item's planned and snapped cut times, whether each side snapped, its plan key and a fingerprint (a hash of the plan key, snapped times, brand, encoder choice, source size and modification time, and the renderer version). An item whose output and thumbnail exist and whose fingerprint matches is skipped unless `--force` is passed.

## check

`check` probes every rendered output and reports:

- 1080x1920, H.264 and AAC, exactly one video and one audio stream;
- duration at most 59.98s, and within 0.1s of its cut length;
- the thumbnail exists;
- Sequential: per source, parts start at 0, touch end to start and add up to the source's duration within 0.1s (checked on the exact cut times).

It writes `work/qa/frames/NNN_1s.jpg`, `NNN_mid.jpg` and `NNN_end.jpg`, contact sheets `work/qa/sheet_01.jpg` onward (six posters each, labeled with ids, so 21 videos fit on four images) and `work/check.json`. Any problem means exit code 5. `schedule` leaves out items that failed the latest check.
