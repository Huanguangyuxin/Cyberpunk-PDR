import { type ScriptablePackBuildProductCache } from '@forgeax/engine-import';
import { type ScanInventory } from '@forgeax/engine-pack/scanner';
import { type PluginAssetSource } from '@forgeax/engine-pack/source';
import { type ScriptablePackSourceSnapshot } from '@forgeax/engine-pack/source-node';
import { type PluginAssetDefinition } from '@forgeax/engine-types';
import type { ProjectFacts } from '../types.js';
export interface PluginSourceRecord {
    readonly definition: PluginAssetDefinition;
    readonly source: PluginAssetSource;
    readonly sourcePath: string;
    readonly sourceKey: string;
    readonly refs: readonly string[];
    readonly module: string;
    readonly export: string;
}
export interface PluginSourceInventory {
    readonly assets: ReadonlyMap<string, PluginSourceRecord>;
    readonly deferred: readonly string[];
    readonly sourceInputs: ReadonlyMap<string, string>;
    readonly sourceSnapshot: ScriptablePackSourceSnapshot;
    readonly filesystemInputs: readonly string[] | undefined;
}
export declare function pluginSourceInputRevision(sourceInputs: ReadonlyMap<string, string>, path: string): string | undefined;
export declare function hasPluginSourceInput(sourceInputs: ReadonlyMap<string, string>, path: string): boolean;
export declare function isPluginAssetSourceIgnoredPath(root: string, path: string): boolean;
export declare function assertPluginSourceRevision(path: string, expected: string | undefined, actual: string): void;
/** Add declared local programs to the existing fence without rebasing any frozen input. */
export declare function capturePluginProgramInputs(projectRoot: string, inventory: Pick<PluginSourceInventory, 'sourceSnapshot'>, module: string, resolveModule?: (specifier: string, importer: string) => Promise<string | undefined>): Promise<void>;
/** Metadata inventories carry their snapshot; two-argument inventories retain their existing leases. */
export declare function discoverPluginAssets(facts: Pick<ProjectFacts, 'root' | 'assetRoots'>, scannedInventory?: ScanInventory, sourceSnapshot?: ScriptablePackSourceSnapshot, productCache?: ScriptablePackBuildProductCache): Promise<PluginSourceInventory>;
export declare function pluginAssetClosure(inventory: PluginSourceInventory, root: string | undefined): readonly PluginSourceRecord[];
/** Merge the final producer projection, rejecting bootstrap definitions that changed while cooking. */
export declare function publishedPluginInventory(projectRoot: string, bootstrap: PluginSourceInventory, pack: Pick<import('@forgeax/engine-vite-plugin-pack').PluginPack, 'readPluginDefinitions'>): Promise<PluginSourceInventory>;
/** Publication must use the exact authored definitions used to bootstrap this session. */
export declare function assertPluginSourceInputs(inventory: PluginSourceInventory, projectRoot: string): Promise<void>;
//# sourceMappingURL=plugin-assets.d.ts.map