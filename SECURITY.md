# Security policy

## Supported versions

Only the latest release on the default branch receives fixes.

## Reporting a vulnerability

Please report privately through GitHub: open this repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for anything that could put users at risk.

Include what you found, how to reproduce it, and what an attacker could do with it. You should hear back within a week.

## What is in scope

- Path traversal or file access outside a project folder through project names, plan files or transcripts.
- Command injection through anything passed to ffmpeg or ffprobe (the tool only ever passes argument arrays).
- Script injection in `dashboard.html` through titles, captions or notes.
- Anything that makes the tool send data over the network. At runtime it makes no network requests.

## What the tool never does

It never downloads video, never asks for or stores passwords, and never sends your footage, schedules or captions anywhere.
