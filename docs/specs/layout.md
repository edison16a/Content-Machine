# Layout

`computeLayout(width, height)` in `packages/core/src/layout` is pure. It takes the source's display size (already corrected for pixel aspect ratio and rotation) and returns rectangles on a 1080x1920 canvas. The same aspect ratio always gives the same layout, so every video in a project looks alike.

## Constants

| Name          | Value                                                      | Why                                            |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Canvas        | 1080 x 1920                                                | 9:16 vertical                                  |
| `SAFE_TOP`    | 230                                                        | clear of the platform's top bar                |
| `SAFE_BOTTOM` | 1540                                                       | clear of the caption and buttons at the bottom |
| `GAP`         | 36                                                         | space between title, video and credit          |
| Title block   | 198 (two lines at 88px with a 1.12 line pitch, rounded up) | reserved even for one-line titles              |
| Credit block  | 64                                                         | logo and channel name                          |

## Landscape and square-ish sources (width / height at least 0.7)

- **Background:** the source scaled to cover the canvas and cropped, blurred at low resolution (shrunk to 270x480, `gblur`, scaled back up), darkened by 35% and given a little more saturation. No black bars ever.
- **Foreground:** the whole, uncropped source scaled to fit 1080 wide by `fgMaxH` high, where `fgMaxH = SAFE_BOTTOM - SAFE_TOP - titleBlock - creditBlock - 2 * GAP` (976px). A 16:9 source becomes 1080x608. Sizes are rounded to even numbers for yuv420p.
- **Position:** the band is centered vertically, then shifted if needed so the title block's top is at or below `SAFE_TOP` and the credit block's bottom is at or above `SAFE_BOTTOM`. The title block ends `GAP` above the band; the credit block starts `GAP` below it.
- **Title block:** always two lines tall. Shorter titles are bottom-aligned in it, so the band sits in exactly the same place on every video.
- **Shadow:** a soft dark glow behind the band (a pre-rendered PNG) lifts it off the background.

For a 16:9 source: title block 422 to 620, band 656 to 1264, credit block 1300 to 1364, centered.

## Portrait sources (width / height under 0.7)

No blur. The source is scaled to cover the full canvas and cropped. The title block starts at `SAFE_TOP + 30` and the credit block ends at `SAFE_BOTTOM`. Text uses the same shadow.

## Guarantees (tested for 16:9, 4:3, 1:1, 4:5 and 9:16)

- Title top at or below `SAFE_TOP`; credit bottom at or above `SAFE_BOTTOM`.
- Title, band and credit never overlap.
- The credit block is centered and at most 744px wide (168px to 912px), clear of the buttons on the right.
- Identical aspect ratios give identical layouts.
