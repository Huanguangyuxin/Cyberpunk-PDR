import { type EngineWorkspaceRuntime } from '@forgeax/engine-app';
import { type CatalogEntry } from '@forgeax/engine-types';
import { createWorkspacePreviewBatch, type PreviewImageCapture } from './workspace-preview-batch.js';
export interface WorkspaceThumbnail {
    readonly guid: string;
    readonly state: 'queued' | 'cooking' | 'ready' | 'failed' | 'unsupported';
    readonly dataUrl?: string;
    readonly error?: {
        readonly code: string;
        readonly expected: string;
        readonly hint: string;
    };
    readonly metrics?: {
        readonly cache: 'hit' | 'miss';
        readonly capture?: Omit<PreviewImageCapture, 'dataUrl'>;
    };
}
interface Inputs {
    readonly producer: string;
    readonly entries: readonly CatalogEntry[];
}
export declare function readPreviewInputs(url: string, signal: AbortSignal): Promise<Inputs>;
/** The project owns a bounded asynchronous queue; View only reads its progressive results. */
export declare function createWorkspaceThumbnails(runtime: Pick<EngineWorkspaceRuntime, 'project'>, changed: () => void, dependencies?: {
    readInputs: typeof readPreviewInputs;
    createBatch: typeof createWorkspacePreviewBatch;
}): {
    refresh: () => void;
    read: (guids: readonly string[]) => Promise<{
        thumbnails: readonly WorkspaceThumbnail[];
    }>;
    tool: import("@forgeax/engine-tool-runtime").ToolContribution<unknown, unknown>;
    close(): Promise<void>;
};
export {};
//# sourceMappingURL=workspace-thumbnails.d.ts.map