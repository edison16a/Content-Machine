import type { ProcessRunner } from '@content-machine/core';
import { runTool } from '../ffmpeg/run.js';

/** A made-up source video: an animated gradient and a tone with pauses. */
export interface SyntheticSpec {
  duration: number;
  width: number;
  height: number;
  fps: number;
  /** Two or more hex colors without '#', e.g. ['1E3A8A', 'F59E0B']. */
  colors: readonly string[];
  /** Times, in seconds, where the audio goes quiet. */
  pauses: readonly number[];
  pauseLength: number;
  toneHz: number;
  /** Set false to produce a video with no audio track at all. */
  audio?: boolean;
}

/** Pauses roughly every `every` seconds with a little deterministic jitter. */
export function pausesEvery(duration: number, every: number, seed = 1): number[] {
  const pauses: number[] = [];
  let state = seed;
  for (let t = every; t < duration - 2;) {
    pauses.push(Number(t.toFixed(2)));
    state = (state * 9301 + 49297) % 233280;
    t += every * (0.7 + 0.6 * (state / 233280));
  }
  return pauses;
}

/** Speech-like amplitude wobble, silent inside every pause. */
export function toneExpression(spec: SyntheticSpec): string {
  const quiet = spec.pauses
    .map((p) => `between(t,${p},${(p + spec.pauseLength).toFixed(2)})`)
    .join('+');
  const voice = `0.25*sin(2*PI*${spec.toneHz}*t)*(0.55+0.45*sin(2*PI*2.7*t))`;
  return quiet === '' ? voice : `if(${quiet},0,${voice})`;
}

/**
 * Renders a synthetic source with ffmpeg's lavfi generators. Used for the
 * demo, tests and screenshots, so the repo never needs real footage.
 */
export async function generateSyntheticSource(
  runner: ProcessRunner,
  outPath: string,
  spec: SyntheticSpec,
): Promise<void> {
  const colors = spec.colors.map((c, i) => `c${i}=0x${c}`).join(':');
  // Gradients are smooth, so drawing them at quarter size and scaling up is
  // indistinguishable and several times faster.
  const small = `${Math.round(spec.width / 4)}x${Math.round(spec.height / 4)}`;
  const video =
    `gradients=s=${small}:${colors}:n=${spec.colors.length}:speed=0.015:r=${spec.fps}:d=${spec.duration},` +
    `scale=${spec.width}:${spec.height}:flags=bicubic`;
  const audio = `aevalsrc='${toneExpression(spec)}':s=48000:d=${spec.duration}`;
  const withAudio = spec.audio !== false;
  await runTool(runner, 'ffmpeg', [
    '-hide_banner',
    '-nostdin',
    '-y',
    '-loglevel',
    'error',
    '-f',
    'lavfi',
    '-i',
    video,
    ...(withAudio ? ['-f', 'lavfi', '-i', audio] : []),
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', '160k', '-ac', '2'] : []),
    '-t',
    String(spec.duration),
    outPath,
  ]);
}
