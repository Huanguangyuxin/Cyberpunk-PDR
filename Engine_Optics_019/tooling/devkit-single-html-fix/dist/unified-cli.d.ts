import { type ArtifactRef } from '@forgeax/engine-tool-runtime';
export interface UnifiedCliResult {
    readonly ok: boolean;
    readonly command?: string;
    readonly value?: unknown;
    /** Evidence refs remain discoverable even when a command fails. */
    readonly artifacts?: readonly ArtifactRef[];
    readonly error?: {
        readonly code: string;
        readonly expected?: string;
        readonly hint?: string;
        readonly detail?: unknown;
    };
}
export declare function runUnifiedCli(argv: readonly string[]): Promise<UnifiedCliResult>;
//# sourceMappingURL=unified-cli.d.ts.map