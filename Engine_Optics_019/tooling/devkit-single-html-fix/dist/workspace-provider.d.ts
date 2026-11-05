import { type EngineWorkspaceProvider } from '@forgeax/engine-app';
import { type BackendHost } from '@forgeax/engine-host/backend';
import { type InlineConfig, type ViteDevServer } from 'vite';
import type { DevKitHostBinding } from './host-binding.js';
export interface DevKitWorkspaceProviderOptions {
    readonly width?: number;
    readonly height?: number;
    /** Select the presentation target. The provider never infers this from the browser. */
    readonly headed?: boolean;
    /** `0` asks Vite for an OS-assigned loopback port. */
    readonly port?: number;
    /** Bound the browser-page readiness handshake and every command result. */
    readonly readyTimeoutMs?: number;
    /** Notify the workspace owner when browser readiness or loss changes a target. */
    readonly onTargetChanged?: () => void | Promise<void>;
    /**
     * Test/host injection points. Production defaults use the real Vite server
     * and backend Host; the provider never launches a browser of its own. The
     * target document is the only browser App/World/AssetRegistry/renderer realm.
     */
    readonly backendFactory?: () => Promise<BackendHost>;
    /**
     * Borrow an already assembled Engine BackendHost for this workspace. The
     * provider owns only the project server, bridge, and command resources when
     * this binding is supplied.
     */
    readonly hostBinding?: DevKitHostBinding;
    readonly viteServerFactory?: (config: InlineConfig) => Promise<ViteDevServer>;
}
export interface DevKitWorkspaceTargetOptions {
    readonly sessionId: string;
    readonly targetId: string;
    readonly width: number;
    readonly height: number;
    readonly headed: boolean;
}
/** A structured failure from the one browser-page workspace transport. */
export declare class DevKitWorkspaceError extends Error {
    readonly code: string;
    readonly expected: string;
    readonly hint: string;
    readonly detail: Readonly<Record<string, unknown>>;
    constructor(code: string, expected: string, hint: string, detail?: Readonly<Record<string, unknown>>);
}
/**
 * HTTP stand-in for {@link awaitCatalogReady} when a server has no Pack plugin
 * handle. A 503 means generation 1 is still scanning; any other status is terminal.
 */
export declare function waitForRuntimeCatalog(serverUrl: string, scopeId: string, timeoutMs: number, signal?: AbortSignal): Promise<void>;
/**
 * Create the DevKit workspace provider used by a real project server.
 *
 * The provider starts one Vite + Host service and returns its URL before the
 * browser is ready. A host navigates its target document to that URL; the generated
 * page creates the sole App/World/AssetRegistry/renderer realm and sends a
 * readiness result over the existing Host transport. Node retains only
 * serializable project/target data and pending command results.
 */
export declare function createDevKitWorkspaceProvider(options?: DevKitWorkspaceProviderOptions): EngineWorkspaceProvider;
//# sourceMappingURL=workspace-provider.d.ts.map