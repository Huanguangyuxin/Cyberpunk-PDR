import type { AnimationPlaybackOptions } from '@forgeax/engine-animation';
import { type ExecutionReport, type ExecutionSelection, type ExecutionWorkersOptions } from '@forgeax/engine-app';
import type { BrowserCaptureSession } from './browser-capture.js';
import type { BrowserCarrierAdapter, BrowserCarrierRunIdentity, BrowserCarrierTarget } from './tools/display-carrier.js';
export interface LiveDevStatus {
    readonly schemaVersion: '1.0.0';
    readonly inputVersion?: string;
    readonly runId?: string;
    readonly root: string;
    readonly endpoint: string;
    readonly pid: number;
    readonly generation: number;
    readonly revision: string;
    readonly loadId: string;
    readonly phase: 'starting' | 'ready' | 'waiting' | 'reloading' | 'failed' | 'stopped';
    readonly url: string | undefined;
    readonly unfinishedEval: boolean;
    readonly frameId: number | undefined;
    readonly worldIdentity: string | undefined;
    readonly workers: ExecutionSelection | undefined;
    readonly execution?: ExecutionReport | undefined;
    readonly backendRequested: LiveDevBackend;
    readonly backend: 'hardware' | 'software' | 'unknown';
    readonly fallbackReason: string | undefined;
    readonly carrier: 'private-browser' | 'borrowed';
    readonly carrierTarget: BrowserCarrierTarget | undefined;
    readonly carrierFallbackReason: string | undefined;
    readonly headless: boolean;
    readonly bridgeConnected: boolean;
    readonly error: string | undefined;
}
export type LiveDevBackend = 'auto' | 'hardware' | 'software';
/**
 * Optional process-local carrier injection for an embedding Engine owner.
 * Detached CLI calls cannot serialize a browser adapter. An embedding owner
 * uses startLiveDev({ inProcess }) to retain the actual Page in its process.
 */
export interface LiveDevDaemonOptions {
    /** Pin inputs and use detached Engine-owned resources, independent of presentation. */
    readonly snapshot?: boolean;
    readonly signal?: AbortSignal;
    readonly onReady?: (status: LiveDevStatus) => void;
    readonly headless?: boolean;
    readonly backend?: LiveDevBackend;
    readonly workers?: ExecutionWorkersOptions;
    readonly animation?: AnimationPlaybackOptions;
    readonly rhiCapture?: boolean;
    readonly carrier?: BrowserCarrierAdapter;
    readonly carrierRun?: BrowserCarrierRunIdentity;
}
type LiveOperation = 'status' | 'observe' | 'reload' | 'stop' | 'capture' | 'verify' | 'rhi/capture' | 'profile/capture' | 'eval' | 'camera/get' | 'camera/set' | 'camera/release' | 'find' | 'focus';
export declare function waitForFirstFrame(session: BrowserCaptureSession, timeoutMs?: number | null): Promise<boolean>;
/** Internal dev resource entry; it is never a public command. */
export declare function runLiveProjectProcess(rootInput: string, generationInput: string, projectPortInput?: string): Promise<void>;
export declare function runLiveDevDaemon(rootInput: string, port: number, sessionFile?: string | undefined, options?: LiveDevDaemonOptions): Promise<void>;
export declare function liveDevStatus(rootInput: string, options?: {
    readonly snapshot?: boolean;
}): Promise<unknown>;
export declare function liveDevControl(rootInput: string, operation: Exclude<LiveOperation, 'status'>, value?: unknown, options?: {
    readonly snapshot?: boolean;
}): Promise<unknown>;
export declare function startLiveDev(rootInput: string, options?: {
    readonly snapshot?: boolean;
    readonly headless?: boolean;
    readonly backend?: LiveDevBackend;
    readonly workers?: ExecutionWorkersOptions;
    readonly animation?: AnimationPlaybackOptions;
    readonly rhiCapture?: boolean;
    /** Explicit process-local composition; never sent through detached CLI arguments. */
    readonly inProcess?: {
        readonly carrier?: BrowserCarrierAdapter;
        readonly signal: AbortSignal;
        /** Attach the actual daemon lifetime to the embedding owner's existing cleanup. */
        readonly onStart?: (closed: Promise<void>) => void;
    };
}): Promise<unknown>;
export declare function removeLiveDevSession(rootInput: string, options?: {
    readonly snapshot?: boolean;
}): Promise<void>;
export {};
//# sourceMappingURL=live-dev.d.ts.map