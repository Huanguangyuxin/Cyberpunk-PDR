import { type ToolContribution, type ToolTerminal } from '@forgeax/engine-tool-runtime';
export declare const DEFAULT_BACKEND_STARTUP_TIMEOUT_MS = 120000;
export declare function resolveBackendStartupTimeoutMs(timeoutMs: number | null | undefined): number | null;
export declare function waitForBackendStartup(timeoutMs: number | null, isReady: () => boolean, assertAlive: () => void, timeoutError: () => Error): Promise<void>;
/** Discover the active public owners without starting a backend or mounting a plugin. */
export declare function discoverDevKitBackendTools(root: string): Promise<readonly ToolContribution[]>;
export declare function runDevKitBackendTool(root: string, operation: string, args?: unknown, signal?: AbortSignal): Promise<ToolTerminal<unknown>>;
export declare function callDevKitBackend(root: string, operation: string, args?: unknown): Promise<unknown>;
export declare function devKitBackendStatus(rootInput: string): Promise<{
    root: string;
    phase: string;
} | {
    hostPack?: string;
    root: string;
    phase: string;
    pid: number;
}>;
export declare function stopDevKitBackend(rootInput: string): Promise<{
    root: string;
    phase: string;
}>;
export declare function devKitBackendHostPack(rootInput: string): string | undefined;
export declare function startDevKitBackend(rootInput: string, options?: {
    readonly hostPack?: string;
    readonly startupTimeoutMs?: number | null;
}): Promise<{
    root: string;
    phase: string;
} | {
    hostPack?: string;
    root: string;
    phase: string;
    pid: number;
}>;
export declare function runDevKitBackendProcess(root: string, id: string): Promise<void>;
//# sourceMappingURL=backend-process.d.ts.map