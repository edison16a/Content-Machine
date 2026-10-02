# Folder structure

## One project

```
projects/<project-name>/
├── dashboard.html      open this: calendar, click any video to watch it with sound
├── project.json
├── README.txt          what each folder is for
├── source/             INPUTS (yours): long videos, <video>.transcript.txt, brief.txt
├── plan/               DECISIONS: plan.json, metadata.json, schedule.json, schedule-history.log, report.md
├── videos/             FINAL: 001.mp4, 002.mp4 and so on (what gets posted; the dashboard plays these)
├── thumbs/             001.jpg and so on (posters)
└── work/               DISPOSABLE: cache, QA images, logs. Safe to delete at any time.
```

## Four kinds of folders, one job each

| Kind | Folders | Who writes it |
| --- | --- | --- |
| Inputs | `source/` | You |
| Decisions | `plan/` | Claude writes `plan.json`, `metadata.json` and `report.md`; the tool owns `schedule.json` and `schedule-history.log` |
| Deliverables | `videos/`, `thumbs/`, `dashboard.html` | The tool |
| Disposable | `work/` | The tool |

Nobody edits `plan/schedule.json`, `videos/`, `thumbs/` or `work/` by hand. Deleting `work/` only costs a little time: the next run rebuilds caches. (It also holds `render-log.json`, so the next `render` re-renders everything and `schedule` needs a render first.)

## Rules that keep it portable

- The dashboard loads videos and posters by **relative path**, so `dashboard.html` must stay next to `videos/` and `thumbs/`. Move or zip the whole project folder as one unit.
- Output names are zero-padded ids with no spaces: `001.mp4`, `002.jpg`.
- Project names use lowercase letters, digits and hyphens.

## Repo root

`schedule-ledger.json` (gitignored) records which posting slots each account has taken across all projects. `config/local.json` (gitignored) holds your own time zone, account and handle overrides.
