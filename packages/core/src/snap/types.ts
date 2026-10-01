/** One item after its cuts were moved onto pauses in the audio. */
export interface SnappedItem {
  id: number;
  source: string;
  plannedStart: number;
  plannedEnd: number;
  start: number;
  end: number;
  /** False when no pause was found near the planned time, so it was kept. */
  startSnapped: boolean;
  endSnapped: boolean;
}

export interface SnapOptions {
  /** How far, in seconds, a cut may move. Default 2. */
  window: number;
}
