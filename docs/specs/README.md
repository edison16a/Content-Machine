# Engine specifications

Each document describes one part of the engine exactly as it is implemented. When you change behavior, change the spec in the same pull request.

| Spec | Code |
| --- | --- |
| [Transcript parsing](transcript.md) | `packages/core/src/transcript` |
| [Plan format and validation](plan.md) | `packages/core/src/plan`, `packages/core/src/schemas/plan.ts` |
| [Snapping cuts to audio](snapping.md) | `packages/core/src/snap`, `packages/render/src/probe/silence.ts` |
| [Layout](layout.md) | `packages/core/src/layout` |
| [Text design](text-design.md) | `packages/render/src/overlays` |
| [Rendering and QA](rendering-and-qa.md) | `packages/render/src/ffmpeg`, `pipeline`, `qa` |
| [Scheduling and statuses](scheduling.md) | `packages/core/src/schedule`, `packages/core/src/status` |
| [Dashboard](dashboard.md) | `packages/dashboard` |

The JSON formats themselves are defined by zod schemas in `packages/core/src/schemas`, exported to [`docs/schemas/`](../schemas/).
