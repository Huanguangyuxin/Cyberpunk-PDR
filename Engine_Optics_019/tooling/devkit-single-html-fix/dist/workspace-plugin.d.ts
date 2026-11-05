import { type EngineWorkspaceProvider, type EngineWorkspaceRuntime } from '@forgeax/engine-app';
import type { Context } from '@forgeax/engine-plugin';
import type { ToolExecutionContext } from '@forgeax/engine-tool-runtime';
import type { DevKitHostBinding } from './host-binding.js';
import { type DevKitWorkspaceProviderOptions } from './workspace-provider.js';
export declare const ENGINE_WORKSPACE_CALL_SERVICE = "engine.workspace.call";
export declare const ENGINE_WORKSPACE_CAPABILITIES_SERVICE = "engine.workspace.capabilities";
export interface DevKitWorkspacePluginOptions extends DevKitWorkspaceProviderOptions {
    readonly hostBinding: DevKitHostBinding;
    readonly provider?: EngineWorkspaceProvider;
    /** Restrict this workspace adapter to observing independent runs. */
    readonly runAccess?: 'control' | 'observe';
    readonly authorize?: (input: {
        readonly operation: string;
        readonly args: unknown;
        readonly caller: ToolExecutionContext['caller'];
        readonly signal: AbortSignal;
    }) => boolean | Promise<boolean>;
}
declare module '@forgeax/engine-plugin' {
    interface EngineContextServices {
        engineWorkspace: EngineWorkspaceRuntime;
        engineWorkspaceCatalog: {
            notePublished(): void;
        };
    }
}
/** Engine domain owner, independent of any product frontend or browser launcher. */
export declare const devKitWorkspacePlugin: {
    name: string;
    inject: string[];
    provide: string[];
    apply(ctx: Context, options: DevKitWorkspacePluginOptions): void;
};
//# sourceMappingURL=workspace-plugin.d.ts.map