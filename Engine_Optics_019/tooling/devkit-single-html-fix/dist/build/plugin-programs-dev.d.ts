import { type PackProgram } from '@forgeax/engine-pack/runtime';
import type { ViteDevServer } from 'vite';
/** Freeze the same final Vite modules consumed by page and plugin imports. */
export declare function captureDevPluginPrograms(server: ViteDevServer, selections: ReadonlyMap<string, string>, identity: string, session?: string): Promise<{
    responses: Map<string, string>;
    moduleIds: Set<string>;
    entries: string[];
    archive: {
        error: string;
        programs?: never;
        imports?: never;
        urls?: never;
    } | {
        programs: Record<string, PackProgram>;
        imports: Record<string, {
            identity: string;
            url: string;
        }>;
        urls: Record<string, string>;
        error?: never;
    };
}>;
//# sourceMappingURL=plugin-programs-dev.d.ts.map