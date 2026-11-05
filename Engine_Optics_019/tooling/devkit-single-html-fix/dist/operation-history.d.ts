import { type ArtifactRef, type JsonValue, type ToolTerminal } from '@forgeax/engine-tool-runtime';
export interface OperationHistoryEntry {
    schemaVersion: 1;
    id: string;
    root: string;
    operation: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    state: 'running' | 'succeeded' | 'failed';
    args: JsonValue;
    result?: JsonValue;
    failure?: JsonValue;
    artifacts: (ArtifactRef & {
        available: boolean;
        unavailableReason?: string;
    })[];
}
export type OperationHistorySummary = Omit<OperationHistoryEntry, 'args' | 'result' | 'failure' | 'artifacts'> & {
    artifactCount: number;
    imageCount: number;
};
export interface OperationHistoryPage {
    root: string;
    items: OperationHistorySummary[];
    nextCursor?: string;
}
/** Node-owned durable command receipts; no renderer, View, background game, or parallel run authority. */
export declare function createOperationHistoryStore(rootInput: string, directoryInput?: string): Promise<{
    root: string;
    list({ limit, before, }?: {
        limit?: number;
        before?: string;
    }): Promise<OperationHistoryPage>;
    get: (id: string) => Promise<OperationHistoryEntry>;
    readArtifact(id: string, index: number): Promise<{
        mediaType: "image/png";
        digest: string;
        data: string;
    }>;
    track<T>(operation: string, args: unknown, execute: () => Promise<ToolTerminal<T>>): Promise<ToolTerminal<T>>;
}>;
export declare function createOperationHistoryTools(defaultRoot?: string): import("@forgeax/engine-tool-runtime").ToolContribution<unknown, unknown>[];
//# sourceMappingURL=operation-history.d.ts.map