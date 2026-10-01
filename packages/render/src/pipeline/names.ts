import { join } from 'node:path';

/** Output base name for an item id: 1 becomes "001". */
export function outputBase(id: number): string {
  return String(id).padStart(3, '0');
}

/** The four project folders the render pipeline reads and writes. */
export interface ProjectDirs {
  root: string;
  sourceDir: string;
  videosDir: string;
  thumbsDir: string;
  workDir: string;
}

/** Folder layout inside a project. Kept in one place so nothing drifts. */
export function projectDirs(root: string): ProjectDirs {
  return {
    root,
    sourceDir: join(root, 'source'),
    videosDir: join(root, 'videos'),
    thumbsDir: join(root, 'thumbs'),
    workDir: join(root, 'work'),
  };
}

/** Paths relative to the project folder, as stored in schedule.json. */
export function relativeOutputs(id: number): { video: string; thumb: string } {
  const base = outputBase(id);
  return { video: `videos/${base}.mp4`, thumb: `thumbs/${base}.jpg` };
}
