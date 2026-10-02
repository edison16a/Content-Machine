# Platform logos

Content Machine draws platform logos on the credit line of every video and on the dashboard tabs. It looks for them in this order:

1. A file in this folder named after the platform: `youtube.png`, `tiktok.png`, `instagram.png`, `twitch.png`, `kick.png`, `x.png`, `facebook.png` (PNG or SVG).
2. The official brand SVG from the [`simple-icons`](https://simpleicons.org/) package, when it has that brand.
3. No logo. The credit line shows only the channel name, and the tool prints a warning.

## What ships in this folder

`youtube.png`, `tiktok.png` and `instagram.png` are the official logos, scaled to 256px tall. TikTok uses its app icon: the note on a black square, so it reads on any background. They are trademarks of their owners (Google, ByteDance and Meta) and are included only to identify the platform a video comes from or goes to. See `THIRD_PARTY_NOTICES.md`.

## Adding or replacing a logo

- Use the platform's official artwork from its brand resources page. Never draw or approximate a logo.
- Save it as `<platform>.png` (transparent background, at least 128px tall) or `<platform>.svg`.
- Run `npm run cm -- doctor` to confirm it is picked up, then re-render.
