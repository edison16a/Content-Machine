/** The README.txt dropped into every new project, explaining its folders. */
export function projectReadme(name: string): string {
  return `Content Machine project: ${name}

Open dashboard.html to see the posting calendar. Click any video to watch it with sound.

Folders (each has one job):

  source/   INPUTS. Your long videos, <video>.transcript.txt files and an optional brief.txt.
    downloads/  Videos and captions saved by "fetch" from a link. Kept apart from your own files.
  plan/     DECISIONS. plan.json (the cuts), metadata.json (titles and captions),
            schedule.json (owned by the tool), schedule-history.log and report.md.
  videos/   FINAL. 001.mp4, 002.mp4 and so on. These are what get posted.
  thumbs/   Posters for the dashboard, one per video.
  work/     DISPOSABLE. Caches, QA images and logs. Safe to delete at any time.

Keep dashboard.html next to videos/ and thumbs/. Move the whole folder as one unit.
Never edit plan/schedule.json, videos/, thumbs/ or dashboard.html by hand; use the CLI:

  npm run cm -- status ${name}
  npm run cm -- open ${name}
`;
}
