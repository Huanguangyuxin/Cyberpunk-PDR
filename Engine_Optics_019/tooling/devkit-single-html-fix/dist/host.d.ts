import type { AnimationPlaybackOptions } from '@forgeax/engine-animation';
import { type HostAssembly } from '@forgeax/engine-host/protocol';
import { type Importer } from '@forgeax/engine-types';
import { type InlineConfig, type Plugin } from 'vite';
import { type PluginSourceInventory } from './build/plugin-assets.js';
import { type DevKitHostBinding } from './host-binding.js';
import type { BootstrapRoot, BuildOptions, CommandResult, ProjectCommandOptions, ProjectFacts, ProjectPortOptions } from './types.js';
export declare function disposeDevKitHosts(): Promise<void>;
export declare const DEFAULT_IMPORTERS: readonly Importer[];
export declare function ignoreDevKitCatalogPath(path: string): boolean;
export declare function devKitDdcRoots(projectRoot: string): {
    readonly buildCacheRoot: string;
    readonly projectDdcRoot: string;
};
/**
 * Reuse the production host's workspace fallback when a second bundle pass
 * resolves Engine packages from a source checkout.
 */
export declare function createEngineWorkspaceResolverForProject(projectRoot: string): Promise<Plugin | undefined>;
export declare function devKitHostBridge(binding?: DevKitHostBinding, assemblyInput?: HostAssembly | (() => Promise<HostAssembly>)): Plugin & {
    releaseForRestart(): Promise<void>;
};
export declare function materializeViteDevPort(port: number): Promise<number>;
/** Await one build command; producer plugins retain their own lifecycle owners. */
export declare function buildProject(options?: BuildOptions, initialSources?: PluginSourceInventory): Promise<CommandResult<unknown>>;
/** Start the Vite development service under one backend Host business plugin. */
export declare function startDevProjectWithHost(options?: ProjectCommandOptions, observeInputs?: (paths: readonly string[]) => void): Promise<CommandResult<unknown>>;
/** Start static dist preview under one DevKit plugin and verify its manifest first. */
export declare function startPreviewProjectWithHost(options?: ProjectCommandOptions): Promise<CommandResult<unknown>>;
export declare function createViteConfig(facts: ProjectFacts, command: 'serve' | 'build', base?: string, options?: {
    readonly initialSources?: PluginSourceInventory;
    readonly materialProfile?: BuildOptions['materialProfile'];
    readonly bootstrapRoot?: BootstrapRoot;
    readonly outDir?: string;
    readonly sourcemap?: BuildOptions['sourcemap'];
    readonly server?: ProjectPortOptions;
    readonly host?: DevKitHostBinding;
    readonly sessionGeneration?: number;
    readonly animation?: AnimationPlaybackOptions;
    readonly target?: BuildOptions['target'];
}): Promise<InlineConfig>;
//# sourceMappingURL=host.d.ts.map