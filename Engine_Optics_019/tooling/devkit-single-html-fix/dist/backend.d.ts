import { type BackendHost, type HostAssembly } from '@forgeax/engine-host';
import { type Context } from '@forgeax/engine-plugin';
export interface DevKitBackend {
    readonly host: BackendHost;
    readonly root: string;
    readonly hostPackageRoot?: string;
    /** Fences browser replacement against this resident backend's source snapshot. */
    assertCurrent(): Promise<void>;
}
declare module '@forgeax/engine-plugin' {
    interface EngineContextServices {
        devkitBackend: DevKitBackend;
        /** Optional native presentation plugin; sampled when explicitly opening a workspace. */
        devkitWorkspaceFrontend: {
            readonly assembly: HostAssembly;
            readonly module: NonNullable<import('./host-binding.js').DevKitHostBinding['frontendModule']>;
        };
    }
}
/** The resident workspace owns domain plugins; a Pack-owned host root remains optional. */
export declare function createDevKitBackend(rootInput: string, options?: {
    readonly hostPack?: string;
}): Promise<{
    host: BackendHost;
    root: string;
    dispose: () => Promise<void>;
}>;
/** Authenticated native Host transport; no browser, project session, or game is started. */
export declare const devKitBackendServerPlugin: {
    name: string;
    inject: string[];
    provide: string[];
    apply(ctx: Context, options: {
        stop: () => void;
    }): Promise<void>;
};
declare module '@forgeax/engine-plugin' {
    interface EngineContextServices {
        devkitBackendServer: {
            readonly endpoint: string;
            readonly token: string;
        };
    }
}
//# sourceMappingURL=backend.d.ts.map