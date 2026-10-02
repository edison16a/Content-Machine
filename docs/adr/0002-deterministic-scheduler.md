# 2. A deterministic scheduler decides every date

Status: accepted

## Context

Consistency is the product: three posts a day per platform at the same times. A language model asked to "spread these over two weeks" will drift, skip slots, or move published items between runs.

## Decision

Scheduling is a pure function of (items, existing assignments, ledger, config, now) in `core`. Claude never computes dates. Assigned items never move; `--rebuild` only releases items still queued everywhere. A repo-wide ledger keeps projects on the same account out of each other's slots.

## Consequences

- The same inputs always give the same calendar, so it can be tested exhaustively (overflow, collisions, idempotence, DST).
- Changing the slot times only affects items scheduled afterwards.
- Users who want a different cadence change `slots` in config, not the playbook.
