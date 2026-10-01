/**
 * Process exit codes. They are part of the public contract: Claude and shell
 * scripts branch on them, so never renumber.
 */
export const ExitCode = {
  ok: 0,
  unexpected: 1,
  usage: 2,
  validation: 3,
  missingDependency: 4,
  renderOrCheckFailure: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * Stable machine-readable error codes. Add new ones at the end of a group;
 * never rename an existing code because callers match on the string.
 */
export const ERROR_CODES = [
  // Usage and project layout
  'E_USAGE',
  'E_INVALID_PROJECT_NAME',
  'E_PATH_TRAVERSAL',
  'E_PROJECT_EXISTS',
  'E_PROJECT_NOT_FOUND',
  'E_FILE_NOT_FOUND',
  'E_ITEM_NOT_FOUND',
  'E_LOCKED',
  // Validation of files and plans
  'E_JSON_PARSE',
  'E_SCHEMA',
  'E_TRANSCRIPT_EMPTY',
  'E_PLAN_INVALID',
  'E_PLAN_GAP',
  'E_PLAN_OVERLAP',
  'E_PLAN_DURATION',
  'E_PLAN_LOCKED',
  'E_SNAP_FAILED',
  'E_TITLE_TOO_LONG',
  'E_METADATA_MISSING',
  'E_METADATA_INVALID',
  'E_STATUS_TRANSITION',
  // Missing tools
  'E_FFMPEG_MISSING',
  'E_FFPROBE_MISSING',
  'E_LIBX264_MISSING',
  'E_FONT_MISSING',
  // Tool and render failures
  'E_FFMPEG_FAILED',
  'E_RENDER_FAILED',
  'E_CHECK_FAILED',
  // Anything we did not anticipate
  'E_UNEXPECTED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
