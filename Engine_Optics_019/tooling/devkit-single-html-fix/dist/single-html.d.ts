import { type DistManifest } from './dist.js';
import type { CommandResult } from './types.js';
declare const SINGLE_HTML_FORMAT: "forgeax-single-html-game";
export interface SingleHtmlBundleArtifact {
    readonly path: string;
    readonly bytes: Uint8Array;
    readonly mediaType: string;
}
export interface SingleHtmlBundle {
    readonly entrySource: string;
    readonly artifacts: readonly SingleHtmlBundleArtifact[];
}
export interface SingleHtmlPackageOptions {
    readonly distRoot: string;
    readonly output: string;
    readonly manifest: DistManifest;
    readonly bundle: SingleHtmlBundle;
}
export interface SingleHtmlPackageResult {
    readonly schemaVersion: '1.0.0';
    readonly format: typeof SINGLE_HTML_FORMAT;
    readonly target: 'file';
    readonly project: DistManifest['project'];
    readonly base: DistManifest['base'];
    readonly html: {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
    };
    readonly checksumPath: string;
    readonly distManifestSha256: string;
    readonly embeddedAssets: number;
    readonly run: {
        readonly local: string;
        readonly shared: string;
    };
}
export declare function bundleSingleHtmlEntry(distRootInput: string, indexHtml: string, projectRoot?: string): Promise<CommandResult<SingleHtmlBundle>>;
export declare function writeSingleHtml(options: SingleHtmlPackageOptions): Promise<CommandResult<SingleHtmlPackageResult>>;
export declare function packageFormatError(format: string): CommandResult<never>;
export declare function packageOutputError(output: string, format: 'web-zip' | 'single-html'): CommandResult<never>;
export {};
//# sourceMappingURL=single-html.d.ts.map