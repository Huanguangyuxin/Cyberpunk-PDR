import { type ArtifactRef, type JsonValue, type ToolContribution, type ToolExecutionContext, type ToolJsonSchema, type ToolRealm } from '@forgeax/engine-tool-runtime';
type CommandValue = {
    readonly ok: true;
    readonly value: unknown;
    readonly artifacts?: readonly ArtifactRef[];
} | {
    readonly ok: false;
    readonly error: {
        readonly code: string;
        readonly expected?: string;
        readonly hint?: string;
        readonly detail?: unknown;
    };
    readonly artifacts?: readonly ArtifactRef[];
};
export declare function command<TArgs extends Record<string, unknown>>(id: string, title: string, summary: string, execute: (args: TArgs, context: ToolExecutionContext) => Promise<CommandValue>, realm?: ToolRealm, options?: {
    readonly schema?: ToolJsonSchema;
    readonly capabilities?: readonly string[];
    readonly errors?: readonly string[];
    readonly example?: JsonValue;
}): ToolContribution<TArgs, unknown>;
export declare function createUnifiedCommandContributions(projectRoot?: string): readonly ToolContribution[];
export {};
//# sourceMappingURL=unified-contributions.d.ts.map