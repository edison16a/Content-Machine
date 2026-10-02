# Content Machine: setup playbook

You are Claude. The user has just downloaded or cloned this repository and wants it ready to use. Do every step yourself, in order, and only stop to ask when a step needs them (a password, a choice). Keep the user posted in one short line per step ("Installing ffmpeg…", "Building…").

Never type or ask for passwords. If a command needs `sudo` or an installer asks for a password, give the user the exact command to run in their own terminal and wait for them to say it is done.

## 1. Tools

Check each tool and install whatever is missing. Use the line for the user's system.

| Tool                | Check              | macOS (Homebrew)      | Windows (winget)                   | Debian or Ubuntu                                                 |
| ------------------- | ------------------ | --------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| Node.js 20 or newer | `node -v`          | `brew install node`   | `winget install OpenJS.NodeJS.LTS` | `sudo apt install nodejs npm` (or nvm if apt's is older than 20) |
| ffmpeg with libx264 | `ffmpeg -version`  | `brew install ffmpeg` | `winget install Gyan.FFmpeg`       | `sudo apt install ffmpeg`                                        |
| yt-dlp              | `yt-dlp --version` | `brew install yt-dlp` | `winget install yt-dlp.yt-dlp`     | `pipx install yt-dlp` (apt's copy is usually too old)            |

- On macOS without Homebrew, give the user the install command from https://brew.sh to run themselves (it asks for their password).
- On Windows, open a new terminal after winget so the new tools are on the PATH.
- If yt-dlp is already installed, update it (`yt-dlp -U`, `brew upgrade yt-dlp` or `pipx upgrade yt-dlp`). Sites change often and old versions stop working.

## 2. Install and build

From the repository folder:

```
npm install
npm run cm -- doctor
```

`npm install` also builds everything. Every line of `doctor` should say `ok` except the optional ones (`Hardware encoder`, `Google Chrome`). Fix any `FAIL` with the hint it prints, then run `doctor` again.

## 3. Personal settings

Ask these together in one message (skip what the user already told you):

1. **Which time zone do you post in?** (for example America/New_York). Posting slots are 12:00, 17:00 and 20:00 there.
2. **Your handles on TikTok, Instagram and YouTube?** Used only to check the right account is logged in when posting. They can skip this.

Write the answers to `config/local.json` (it is gitignored and overrides `config/defaults.json`), for example:

```json
{
  "timezone": "America/New_York",
  "handles": { "tiktok": "me", "instagram": "me", "youtube": "@me" }
}
```

Run `npm run cm -- doctor` once more to make sure the config loads.

## 4. Open the dashboard

Run `npm run cm -- open`. It opens `index.html` at the top of the repository folder. Tell the user:

- This one page is their dashboard for every project. **Bookmark it and leave it open.** It updates itself every few seconds and shows a Post now strip whenever something is due.
- If they opened it before setup and it said "not set up yet", refresh it once.

## 5. Done

Finish with a short message like:

> You're set up. To make videos, say **"Use Content Machine: <video link>"** (or give me a file on your computer). I'll download it, plan the cuts, render them and schedule three a day. Only use videos you own or have permission to use.

Do not run the demo or create projects unless the user asks.
