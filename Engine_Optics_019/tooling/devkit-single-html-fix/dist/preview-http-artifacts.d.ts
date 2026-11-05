import type { Plugin } from 'vite';
import type { DistManifest } from './dist.js';
/** Prepare only verified BIN representations; the dist files remain the authority. */
export declare function preparePreviewHttpArtifacts(root: string, manifest: DistManifest): Promise<Plugin>;
//# sourceMappingURL=preview-http-artifacts.d.ts.map