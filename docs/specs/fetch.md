# Fetching a video from a link

`npm run cm -- fetch <project> <url>` downloads one video and its captions with [yt-dlp](https://github.com/yt-dlp/yt-dlp). yt-dlp is installed by the user (see `playbook/setup.md`); it is not bundled. The pure parts (checking the link, reading yt-dlp's JSON, picking captions, building arguments) live in `packages/core/src/fetch`. Running yt-dlp and moving files lives in `packages/cli/src/download`.

## Steps

1. **Check the link.** It must be an `http` or `https` URL. Anything else (search words, a local path) is a usage error, so a typo never turns into a yt-dlp search.
2. **Find yt-dlp.** `yt-dlp --version`. Missing means `E_YTDLP_MISSING` (exit 4) with install commands.
3. **Read the video's details** with `--dump-single-json --no-playlist`. Only `id`, `title`, `channel`, `uploader`, `extractor_key`, `duration`, `language`, `is_live`, `subtitles` and `automatic_captions` are read. Playlists and live streams are refused.
4. **Name the file.** The title as lowercase letters, digits and hyphens, at most 60 characters, falling back to the site's id. `--name <file>` overrides it.
5. **Skip if already there.** If `<name>.mp4` is in `source/` or `source/downloads/`, nothing is downloaded and the result says `alreadyDownloaded: true`.
6. **Download** into `source/downloads/` as `<name>.mp4`.
7. **Adopt the captions** as `<name>.transcript.txt` next to the video.
8. **Remember the source.** If the project's `channel` is empty, `channel` and `sourcePlatform` are filled in from the video, so the credit line is right. A channel you set is never replaced.

## Download format

`--format bv*+ba/b --format-sort vcodec:h264,res:1080,acodec:aac --merge-output-format mp4 --remux-video mp4`.

H.264 up to 1080p is preferred because it decodes fast while rendering and the output is 1080 wide anyway. Streams are muxed or remuxed into MP4 and never re-encoded, so the audio arrives exactly as published.

On yt-dlp 2025.11.12 and newer, `--js-runtimes node` is added: YouTube needs a JavaScript runtime and every Content Machine user already has Node. Older versions do not know the flag, so it is left out for them.

## Which captions

Captions written by a person beat automatic ones. Within each kind:

| Kind      | Order                                                                                         |
| --------- | --------------------------------------------------------------------------------------------- |
| Human     | the video's spoken language (`es` matches `es-419`), then English, then the first listed      |
| Automatic | the track ending in `-orig` (transcribed from the audio), then the spoken language, then `en` |

`live_chat` and `rechat` tracks are ignored. The file is saved as WebVTT or SRT, which the transcript parser reads. If the only format available is something else, the result says so and the user pastes a transcript instead. A `<name>.transcript.txt` that already exists is never overwritten.

## Output

`--json` prints `url`, `video` (the file name to use in plans and commands), `path`, `title`, `channel`, `platform`, `duration`, `transcript` (a path or `null`) and `alreadyDownloaded`.

## Where plans find the file

Plans store only the file name. `render`, `check`, `preview`, `transcript` and `autoplan` look in `source/` first, then `source/downloads/`, so a fetched video behaves exactly like one you copied in.

## Errors

| Code                | Exit | When                                                  |
| ------------------- | ---- | ----------------------------------------------------- |
| `E_USAGE`           | 2    | not a link, a playlist, a live stream, a bad `--name` |
| `E_YTDLP_MISSING`   | 4    | yt-dlp is not installed                               |
| `E_DOWNLOAD_FAILED` | 5    | yt-dlp failed; the hint carries its `ERROR:` line     |
