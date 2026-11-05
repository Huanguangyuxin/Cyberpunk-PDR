import type { CommandResult, ProjectCommandOptions } from './types.js';
export interface SourceTransferOptions extends ProjectCommandOptions {
    readonly sourceRoot: string;
    readonly sourcePath: string;
    /** New directory beneath one of the target project's configured asset directories. */
    readonly targetPath: string;
    readonly cloneIdentities?: boolean;
    readonly expectedRevision?: string;
}
/** An author transfer is prepared in isolation and commits only after validation and revision fences. */
export declare function assetSourceImportCommand(options: SourceTransferOptions): Promise<CommandResult<unknown>>;
/** The Pack gateway retains operation idempotency; DevKit owns the project transaction. */
export declare function transferPackOperation(root: string, operation: import('@forgeax/engine-pack/source').PackAuthoringOperation): Promise<import("@forgeax/engine-types").ResultErr<{
    code: "pack-source-mutation-unsupported";
    expected: string;
    hint: string;
    detail: {
        packageId: string;
    };
}> | import("@forgeax/engine-types").ResultErr<{
    code: "pack-source-revision-conflict" | "pack-source-mutation-unsupported";
    expected: string;
    hint: string;
    detail: {
        cause: import("./types.js").CommandError;
    };
}> | import("@forgeax/engine-types").ResultOk<{
    operation: "asset.list" | "asset.inspect" | "asset.resolve" | "asset.verify" | "asset.source.create" | "asset.source.clone" | "asset.source.import" | "asset.source.instance.create" | "asset.source.values.apply" | "asset.source.rebuild" | "asset.source.cold-cook" | "asset.source.draft";
    requestId: string;
}>>;
//# sourceMappingURL=source-transfer.d.ts.map