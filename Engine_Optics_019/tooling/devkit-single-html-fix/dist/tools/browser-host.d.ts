import type { ToolPreviewCaptureResult, ToolPreviewRecipe, ToolPreviewResourceRequest } from '@forgeax/engine-app';
import { type ResourcePreviewReport } from '@forgeax/engine-preview';
import { type ArtifactRef, type SnapshotRef, type ToolDomainFailure } from '@forgeax/engine-tool-runtime';
import { type Frame, type Page } from 'playwright';
import { type BrowserCaptureOpenOptions } from '../browser-capture.js';
import type { BootstrapRoot } from '../types.js';
import type { PreviewHostResult } from './preview-host.js';
export type BrowserHostResult = {
    readonly ok: true;
    readonly value: PreviewHostResult;
} | {
    readonly ok: false;
    readonly error: ToolDomainFailure;
    readonly artifacts?: readonly ArtifactRef[];
};
/** Observe the generated Host's readiness within its existing startup budget. */
export declare function waitForBrowserToolHost(realm: Page | Frame, name: '__forgeaxToolHost' | '__forgeaxToolReplayHost', timeoutMs?: number): Promise<void>;
export interface ResourcePreviewReportInput {
    readonly snapshot: SnapshotRef;
    readonly subject: ResourcePreviewReport['subject'];
    readonly presentation: ResourcePreviewReport['presentation'];
    readonly oracle: ResourcePreviewReport['oracle'];
}
export interface BrowserHostOptions extends Pick<BrowserCaptureOpenOptions, 'backend' | 'headless' | 'carrier' | 'carrierRun' | 'carrierGeneration'> {
    readonly publish?: boolean;
}
/** @internal Vite treats port 0 as its default 5173, not as an OS-assigned port. */
export declare function allocateLoopbackPort(): Promise<number>;
export declare function publishPreviewArtifacts(projectRoot: string, runId: string, result: PreviewHostResult, reportInput?: ResourcePreviewReportInput): Promise<PreviewHostResult>;
/** A failed replay still owns the real capture evidence; it has no successful preview manifest. */
export declare function publishFailedPreviewCapture(projectRoot: string, runId: string, capture: ToolPreviewCaptureResult): Promise<readonly ArtifactRef[]>;
export declare function runBrowserPreviewHost(projectRoot: string, recipe: ToolPreviewRecipe, snapshot: SnapshotRef, runId: string, signal: AbortSignal, bootstrapRoot?: BootstrapRoot, resource?: ToolPreviewResourceRequest, options?: BrowserHostOptions): Promise<BrowserHostResult>;
export declare function runBrowserResourcePreviewHost(projectRoot: string, recipe: ToolPreviewRecipe, snapshot: SnapshotRef, runId: string, signal: AbortSignal, resource: ToolPreviewResourceRequest, options?: BrowserHostOptions): Promise<BrowserHostResult>;
//# sourceMappingURL=browser-host.d.ts.map