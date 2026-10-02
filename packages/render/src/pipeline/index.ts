export { analyzeSources, snapToAudio, type SourceAnalysis } from './analyze.js';
export { RENDER_VERSION, fingerprint, type FingerprintInput } from './fingerprint.js';
export { outputBase, projectDirs, relativeOutputs, type ProjectDirs } from './names.js';
export { previewItem } from './preview.js';
export { DOWNLOADS_FOLDER, locateSource } from './sources.js';
export { prepareJob, renderItem, type ItemRenderSpec } from './render-item.js';
export {
  renderProject,
  type ItemOutcome,
  type ItemStatus,
  type RenderDeps,
  type RenderOptions,
  type RenderResult,
} from './render-project.js';
export {
  generateSyntheticSource,
  pausesEvery,
  toneExpression,
  type SyntheticSpec,
} from './synthetic.js';
export { THUMB, extractFrame, makeThumbnail } from './thumbnail.js';
