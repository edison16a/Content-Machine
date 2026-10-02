# Step 1: Intake

Ask these together in ONE message (use your interactive question tool if you have one; skip anything the user already told you). Then proceed without further questions unless something is missing.

> Let's set up your videos. A few quick questions:
>
> 1. **What type of video?**
>    - **Sequential:** the whole video start to finish, split into parts of varying length (up to 60 seconds), cut at good story beats. Every part carries the video's title.
>    - **Clip:** only the best moments, each cut out on its own with its own title explaining what happened.
> 2. **What's the title of the video?** (On Sequential, this exact title appears on every part.)
> 3. **What should the project folder be called?** (lowercase letters, digits and hyphens; suggest one from the title)
> 4. **Which channel is it from, and which platform?** (YouTube, Twitch, Kick or other)
> 5. **Where is the video?** A link is easiest (I download it and its captions). Or give me the path to the file on your computer and paste the **transcript** (YouTube: "Show transcript", then copy).
> 6. **Do you own this footage or have permission to use it?** (your own video, a clipping program, the creator agreed) And does that cover this type of use?
> 7. _(Clip only)_ **How many days of clips?** (default 7, which is 21 clips at 3 a day)

**If the user gave a link,** skip questions 2, 4 and 5: `fetch` reads the title, channel and platform from the link. Ask only 1, 3, 6 and 7 (for 3, suggest a name from the link or let them say "you pick"). After `fetch`, use the video's title as the post title; on Sequential, show it to the user in your next message since it goes on every part.

Then:

- Create the project: `npm run cm -- new <project>`.
- **From a link:** `npm run cm -- fetch <project> <link> --json`. It downloads the video to `source/downloads/<name>.mp4`, saves the best captions as `source/downloads/<name>.transcript.txt`, and fills in `channel` and `sourcePlatform` in `project.json` if they were empty. Use the `video` value it prints as the file name from here on. If it says there were no captions, ask the user to paste a transcript into that path, or offer autoplan (Sequential only). If yt-dlp is missing, follow `playbook/setup.md`.
- **From a file:** copy or move the video into `projects/<project>/source/` and save the pasted transcript to `source/<video-name>.transcript.txt`. Set `channel` and `sourcePlatform` in `project.json`.
- Run `npm run cm -- transcript <project> <video-file>` (works for files in `source/` and `source/downloads/`) and note the video's exact duration. If the transcript looks incomplete, tell the user before continuing.
- **First time only,** ask for the user's handles on TikTok, Instagram and YouTube (for checking the right account when posting) and save them under `handles` in `project.json`. Ask nothing about posting cadence: it is fixed at 3 a day per platform.
- If there is no transcript, offer `npm run cm -- autoplan` (Sequential only; it splits at pauses in the audio).
- If the user adds a new video to an existing project, **append** new items with the next ids; never touch existing items.
