import type { ToolContribution, ToolRunOptions, ToolTerminal } from '@forgeax/engine-tool-runtime';
import type { CaptureBackend } from '../types.js';
export interface NativePreviewOptions {
    readonly backend?: CaptureBackend;
    readonly headless?: boolean;
    readonly width?: number;
    readonly height?: number;
    /** Copy the validated fresh-replay PNG to this project-relative path. */
    readonly output?: string;
}
export declare function runNativePreviewTool(contribution: ToolContribution<unknown, unknown>, args: unknown, options: ToolRunOptions, projectRoot: string, previewOptions?: NativePreviewOptions): Promise<ToolTerminal<unknown>>;
//# sourceMappingURL=native-preview.d.ts.map