# 1. Render with ffmpeg, not a React video renderer

Status: accepted

## Context

Every output is the same composition: a blurred background, the source in a band, a title and a credit. We need frame-accurate cuts, untouched audio, fast renders on a laptop, and no browser in the render path.

## Decision

Render with one ffmpeg run per item. Draw text and the band shadow once per item with `@napi-rs/canvas` into PNGs and let ffmpeg composite them, with the fade and rise as ffmpeg expressions.

## Consequences

- Renders run at roughly real time on a laptop and need nothing but ffmpeg.
- Audio is copied through an encoder with no filters, which is easy to prove in tests by inspecting the argument array and comparing decoded levels.
- Motion is limited to what ffmpeg expressions can do. That fits the deliberately quiet look (a fade and a short rise).
- Text rendering does not depend on ffmpeg's `drawtext` or the system's fonts.
