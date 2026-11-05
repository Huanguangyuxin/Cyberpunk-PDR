import { type ToolContribution } from '@forgeax/engine-tool-runtime';
import { type OfflineAnalysisRequest, type OfflineAnalysisResult } from './offline-analysis.js';
import type { PreviewHostRequest, PreviewHostResult } from './preview-host.js';
export declare function createPreviewContribution(): ToolContribution<PreviewHostRequest, PreviewHostResult>;
export declare function createOfflineAnalysisContribution(): ToolContribution<OfflineAnalysisRequest, OfflineAnalysisResult>;
export declare function createPreviewContributions(): readonly ToolContribution<unknown, unknown>[];
//# sourceMappingURL=preview-contributions.d.ts.map