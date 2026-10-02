# Step 5: show the dashboard

1. Run `npm run cm -- open <project>`. This opens `index.html` at the repo root: the live dashboard for every project. If you have a browser tool (for example the Claude in Chrome extension), also navigate it to `file://<absolute path>/index.html` so the user sees it right inside the conversation. If a file URL is blocked, the system browser from `open` is enough.
2. Tell the user once that they can **leave that tab open for good**. Every command rewrites `projects/dashboard-data.js` and the page picks it up within a few seconds. The strip at the top shows the time where the project posts, anything due to post right now, and a countdown to the next post. If they have several projects, a picker appears at the top.
3. Check the first and last scheduled dates, that the three platform tabs show logos and times, and that clicking a video plays it with sound.
4. Tell the user, in a few lines: how many videos were made, which dates they cover (3 a day, per platform), and that they can click any card to watch it with sound. Nothing is posted yet.
5. Ask whether they'd like you to upload the videos into each platform's scheduler now.
