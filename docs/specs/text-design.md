# Text design

All text is drawn in TypeScript with `@napi-rs/canvas` into transparent PNGs. ffmpeg's `drawtext` is never used, so text looks the same on every machine.

## The look

Big, heavy, clean title text directly on the blurred background with **no box or card**: white, with exactly one word or phrase (the accent) in a warm color, two balanced lines, centered, a soft dark shadow, title case, no emojis.

## Title

- **Font:** Poppins ExtraBold, bundled in `assets/fonts/` and registered under its own name so a system install can never be picked instead.
- **Title case:** each all-lowercase word gets a capital first letter. Words that already contain capitals (`iPhone`, `NASA`) are left alone.
- **Accent:** the accent words are found in the title ignoring case and punctuation and drawn in the accent color (default `#FF8A1F`). Text is drawn word by word using measured widths.
- **Balanced breaking:** every split point is tried and the one with the smallest difference between line widths wins. A single word is never left alone on the last line unless the title is one or two words. A title stays on one line when it is one word, two words that fit, or narrower than 60% of the maximum width.
- **Auto-fit:** start at 88px and step down by 2px to 60px until each line is at most 85% of the canvas width (918px). If two lines cannot fit at 60px, rendering fails with `E_TITLE_TOO_LONG` and a hint giving the maximum length in characters.
- **Shadow:** two passes, soft and wide rather than an outline: `rgba(0,0,0,0.6)` with blur 20 and offset 4, then `rgba(0,0,0,0.35)` with blur 6 and offset 2.

## Credit line

The source platform's logo at 56px tall, a 16px gap, then the channel name in Poppins ExtraBold, white, 52px, with the same shadow. It starts 60px from the left and its right edge stays at or before 864px, clear of the platforms' like and comment buttons. Long names shrink to 36px, then are truncated with an ellipsis.

## Logos

Logos are never drawn or approximated. The order is:

1. A file in `assets/icons/<platform>.png` or `.svg` (YouTube, TikTok and Instagram ship there).
2. The official brand SVG from the `simple-icons` package (Twitch, Kick, X, Facebook). Brand colors too dark to read on video are drawn white.
3. Nothing: the credit shows only the channel name and the tool prints a warning.

## Motion (in ffmpeg)

The title fades in over 0.35s starting at 0.1s and rises 20px with an ease-out curve (`y + 20 * (1 - p)^3`). The credit fades in at the same time with no rise. Both stay for the whole video. No bounce, no shake.

## Caching

Overlay PNGs are cached in `work/cache/overlays/`, keyed by a hash of everything that shapes them. Sequential parts share one title PNG.
