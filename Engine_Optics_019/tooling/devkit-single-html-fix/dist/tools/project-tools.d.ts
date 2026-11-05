import { type ToolCommandDeclaration, type ToolContribution, type ToolRealm } from '@forgeax/engine-tool-runtime';
import { type PluginSourceInventory } from '../build/plugin-assets.js';
export interface ProjectToolBinding {
    readonly contribution: ToolContribution<unknown, unknown>;
    readonly assetGuid: string;
    readonly sourceRevision: string;
    readonly contractDigest: string;
    readonly moduleName: string;
    readonly realm: ToolRealm;
    readonly declaration: ToolCommandDeclaration;
    readonly executor?: string;
}
export interface ProjectToolModuleLoader {
    readonly load: (name: string) => Promise<unknown>;
    readonly resolve: (specifier: string, importer: string) => Promise<string | undefined>;
    readonly close: () => Promise<void>;
}
export interface ProjectToolDiscoveryOptions {
    readonly moduleLoader?: ProjectToolModuleLoader;
    readonly inventory?: PluginSourceInventory;
}
/** Source-only discovery installs no plugin, Cooker or executor. */
export declare function discoverProjectTools(rootInput: string, options?: ProjectToolDiscoveryOptions): Promise<readonly ProjectToolBinding[]>;
/** Discover only the selected external Host Pack; the project does not own this source. */
export declare function discoverHostPackTools(hostPack: string): Promise<readonly ProjectToolBinding[]>;
/** Build projection of known declarations; deferred sources remain explicit to the caller. */
export declare function projectToolProjection(root: string, inventory: PluginSourceInventory): Promise<{
    readonly tools: readonly ProjectToolBinding[];
    readonly deferredSources: readonly string[];
}>;
//# sourceMappingURL=project-tools.d.ts.map