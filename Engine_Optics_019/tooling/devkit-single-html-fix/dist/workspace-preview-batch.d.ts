export interface PreviewImageCapture {
    readonly dataUrl: string;
    readonly preparedMs: number;
    readonly totalMs: number;
    readonly submitted: number;
    readonly ready: number;
}
/** Lazy browser carrier; one page retains GPU, pipelines and assets across image leases. */
export declare function createWorkspacePreviewBatch(url: string): {
    capture(asset: {
        guid: string;
        kind: string;
    }, input: string, signal: AbortSignal): Promise<PreviewImageCapture>;
    close: () => Promise<void>;
};
//# sourceMappingURL=workspace-preview-batch.d.ts.map