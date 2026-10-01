import type { Clock } from '@content-machine/core';

/** The wall clock. Only the CLI should create this; everything else takes a Clock. */
export const systemClock: Clock = { now: () => new Date() };
