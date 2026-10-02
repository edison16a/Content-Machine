# Third-party notices

Content Machine is released under the MIT License. It ships or depends on the following third-party material.

## Bundled in this repository

| Item                                                               | Path                                         | License                                                             |
| ------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------------- |
| Poppins ExtraBold font, Copyright 2020 The Poppins Project Authors | `assets/fonts/Poppins-ExtraBold.ttf`         | SIL Open Font License 1.1, see `assets/fonts/OFL.txt`               |
| YouTube logo                                                       | `assets/icons/youtube.png`                   | Trademark of Google LLC                                             |
| TikTok logo                                                        | `assets/icons/tiktok.png`                    | Trademark of ByteDance Ltd.                                         |
| Instagram logo                                                     | `assets/icons/instagram.png`                 | Trademark of Meta Platforms, Inc.                                   |
| GitHub mark (in the dashboard's "View on GitHub" button)           | `packages/dashboard/src/client/lib/icons.ts` | From GitHub Octicons (MIT); the mark is a trademark of GitHub, Inc. |

The platform logos are used only to identify where a video comes from or where it is posted. Their use does not imply any affiliation with or endorsement by their owners. Replace or remove them in `assets/icons/` if your use requires it.

## Runtime dependencies

| Package                                                        | License                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------- |
| [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas)    | MIT                                                     |
| [`simple-icons`](https://github.com/simple-icons/simple-icons) | CC0 1.0 (brand marks remain trademarks of their owners) |
| [`commander`](https://github.com/tj/commander.js)              | MIT                                                     |
| [`zod`](https://github.com/colinhacks/zod)                     | MIT                                                     |

## External tools

[ffmpeg](https://ffmpeg.org/) is required but not bundled. It is installed separately by the user under its own licenses (LGPL or GPL depending on the build; builds with libx264 are GPL).

Development dependencies (TypeScript, ESLint, Prettier, Vitest, Playwright, esbuild, tsx) are not distributed with the project.
