# Step 5: show the dashboard

1. Run `npm run cm -- open <project>`. If you have a browser tool (for example the Claude in Chrome extension), also navigate it to `file://<absolute path>/projects/<project>/dashboard.html` so the user sees it right inside the conversation. If a file URL is blocked, the system browser from `open` is enough.
2. Check the first and last scheduled dates, that the three platform tabs show logos and times, and that clicking a video plays it with sound.
3. Tell the user, in a few lines: how many videos were made, which dates they cover (3 a day, per platform), and that they can click any card to watch it with sound. Nothing is posted yet.
4. Ask whether they'd like you to upload the videos into each platform's scheduler now.
