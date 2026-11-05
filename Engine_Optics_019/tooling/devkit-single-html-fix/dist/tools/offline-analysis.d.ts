import { type PreviewArtifactManifest, type PreviewArtifactRole } from '@forgeax/engine-preview';
import { type ToolArtifactManifest, type ToolDomainFailure, type ToolEvidenceKind } from '@forgeax/engine-tool-runtime';
export interface OfflineAnalysisRequest {
    readonly manifest: PreviewArtifactManifest | ToolArtifactManifest;
    readonly required?: readonly (PreviewArtifactRole | ToolEvidenceKind)[];
}
export interface OfflineAnalysisResult {
    readonly runId: string;
    readonly captureId: string;
    readonly artifacts: readonly {
        readonly kind: string;
        readonly digest: string;
    }[];
}
export declare function analyzePreviewArtifacts(request: OfflineAnalysisRequest): {
    readonly ok: true;
    readonly value: OfflineAnalysisResult;
} | {
    readonly ok: false;
    readonly error: ToolDomainFailure;
};
//# sourceMappingURL=offline-analysis.d.ts.map