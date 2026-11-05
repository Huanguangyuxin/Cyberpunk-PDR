import type { DevKitAppOptions } from '../plugin-build.js';
type PipelineLibraryManifest = NonNullable<DevKitAppOptions['pipelineLibrary']>;
/** Precompute reachable entry closures once, before any player loads the library. */
export declare function precomputePipelineLibrary(manifest: PipelineLibraryManifest): Promise<PipelineLibraryManifest>;
export {};
//# sourceMappingURL=pipeline-library.d.ts.map