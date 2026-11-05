/** Read the actual renderer through the existing revision-fenced live control. */
export declare function exportPipelineLibrary(root: string, args: {
    readonly revision: string;
    readonly output?: string;
}): Promise<{
    ok: false;
    error: {
        code: string;
        hint: string;
    };
    value?: never;
} | {
    ok: false;
    error: {
        code: string;
        expected: string;
        hint: string;
        detail: unknown;
    };
    value?: never;
} | {
    ok: true;
    value: {
        revision: string;
        output: string;
        sha256: string;
        byteLength: number;
        inspection: import("@forgeax/engine-rhi").PipelineLibraryInspection;
        frame: unknown;
        scope: string;
    };
    error?: never;
}>;
//# sourceMappingURL=pipeline-library-export.d.ts.map