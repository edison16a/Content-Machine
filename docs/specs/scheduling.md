# Scheduling and statuses

The tool decides every date and time. A language model never computes posting dates.

## Rules (`packages/core/src/schedule`, pure)

- Exactly `slots.length` videos per day per platform (3 by default, at 12:00, 17:00 and 20:00), at the same wall-clock times every day.
- The same video goes to all three platforms. A platform's time is the slot time plus its stagger (TikTok 0, Instagram +15, YouTube +30 minutes by default).
- Items are assigned in ascending id order. The first unassigned item gets the first free slot that is at or after **tomorrow's first slot**, after the project's last assigned slot, and not taken in the ledger by another project on the same `account`.
- Overflow rolls forward without limit: a 30-video backlog fills 10 days.
- **Idempotent:** an assigned item never moves. Running `schedule` again only places new items.
- `--rebuild` releases only items that are still `queued` on every platform and places them again from tomorrow; every other item keeps its slot and gets a warning.
- Times are wall-clock in the project's time zone, computed with `Intl`, and correct across daylight saving changes (tested on 2026-11-01 and 2027-03-14). A repeated fall-back time resolves to its first occurrence.

The scheduler is a pure function of (items, existing assignments, ledger, config, now).

## The ledger

`schedule-ledger.json` at the repo root (gitignored) records which `(date, slot)` pairs each account has taken, per project. Two projects that post to the same accounts can never share a slot. `schedule` holds a lock on the ledger and on the project's schedule while it writes.

## Inputs

`schedule` uses rendered items from `work/render-log.json` that still exist in the plan, have an output file and did not fail the latest check. Every one of them needs an entry in `plan/metadata.json` (`E_METADATA_MISSING` otherwise). YouTube post titles must be under 100 characters.

## Statuses (`packages/core/src/status`)

| Status | Meaning |
| --- | --- |
| `queued` | Has a slot, not yet in the platform's own scheduler |
| `scheduled` | Entered in the platform's scheduler |
| `posted` | Confirmed live |
| `failed` | Something went wrong; see the note |

Allowed moves: queued to scheduled, scheduled to posted, anything to failed, failed back to queued. Everything else is refused (`E_STATUS_TRANSITION`). A `mark` request is all or nothing; setting a status an entry already has is a quiet no-op. Every change is appended to `plan/schedule-history.log` as a tab-separated line: time, item, platform, from, to, note.
