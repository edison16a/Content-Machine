/** One line of speech with its time range in seconds. */
export interface Segment {
  start: number;
  end: number;
  text: string;
}

export type TranscriptFormat = 'youtube' | 'srt' | 'vtt';

/** A raw cue before end times are filled in. YouTube pastes have no end. */
export interface RawCue {
  start: number;
  end?: number;
  text: string;
}

export interface TranscriptStats {
  segments: number;
  firstTimestamp: number;
  lastTimestamp: number;
  videoDuration: number;
  /** Share of the video covered before the last timestamp, 0 to 1. */
  coverage: number;
}

export interface Transcript {
  format: TranscriptFormat;
  segments: Segment[];
  stats: TranscriptStats;
  warnings: string[];
}
