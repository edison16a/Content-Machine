/** Hard ceiling for every output. Platforms count 60.0s as "over a minute". */
export const MAX_ITEM_SECONDS = 59.98;
/** Shortest output either mode allows. */
export const MIN_ITEM_SECONDS = 8;
/** Sequential parts shorter than this get a warning (they feel abrupt). */
export const SEQUENTIAL_SHORT_WARNING = 20;
/** How far the last Sequential part may end from the true end of the source. */
export const SOURCE_END_TOLERANCE = 0.5;
/** Rounding slack when comparing one item's end to the next item's start. */
export const CONTIGUITY_TOLERANCE = 0.01;
