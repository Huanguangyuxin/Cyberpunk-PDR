import type { HostRootDescriptor } from '@forgeax/engine-host/protocol';
import { type ToolCommandContract } from '@forgeax/engine-tool-runtime';
import type { PluginAssetDefinition, PluginBuildTarget, RuntimeAssetBinding } from '@forgeax/engine-types';
import type { PluginPack } from '@forgeax/engine-vite-plugin-pack';
import type { Plugin } from 'vite';
import { type ProjectToolBinding } from '../tools/project-tools.js';
import { type PluginSourceInventory, type PluginSourceRecord } from './plugin-assets.js';
export declare const pluginRuntimeQuery = "?forgeax-plugin-runtime";
export declare function exportModule(module: string, name: string): string;
export declare function assertStaticPluginImports(source: string, filename: string): void;
/** Remove the authoring expression. Remaining exports use standard bundler semantics. */
export declare function projectPluginRuntimeSource(source: string, filename: string): {
    code: string;
    map: import("magic-string").SourceMap;
};
export declare function pluginRootDescriptor(definition: PluginAssetDefinition): HostRootDescriptor;
export declare function pluginProgramSpecifier(record: Pick<PluginSourceRecord, 'module' | 'export' | 'sourcePath'>): string;
/** Pure producer projection shared by normal delivery and portable program capture. */
export declare function projectPluginPrograms(records: readonly PluginSourceRecord[], target: PluginBuildTarget, tools?: readonly ProjectToolBinding[], projectRoot?: string): {
    programs: Map<string, {
        readonly module: string;
        readonly export: string;
    }>;
    tools: Map<string, ToolCommandContract>;
};
export declare function pluginProgramSource(records: readonly PluginSourceRecord[], target: PluginBuildTarget, definitions: readonly (readonly [string, PluginAssetDefinition['evidence']])[], tools?: readonly ProjectToolBinding[], projectRoot?: string, archiveSuffix?: string): string;
/** Shared projection for Node, browser and Worker module graphs. */
export declare function pluginRuntimeProjection(projectRoot?: string, sourceInputs?: ReadonlyMap<string, string>): Plugin;
export declare function assertPluginProgramGraphInputs(projectRoot: string, inventory: PluginSourceInventory, modules: Iterable<string>, moduleInfo: (id: string) => {
    readonly importedIds: readonly string[];
    readonly dynamicallyImportedIds: readonly string[];
} | null): void;
export interface PluginProgramBuildOptions {
    /** Native package modules use the same static projection without browser archive delivery. */
    readonly delivery?: 'browser' | 'native';
    readonly projectRoot: string;
    readonly namespace?: string;
    readonly tools?: readonly ProjectToolBinding[];
    readonly roots: Readonly<Partial<Record<PluginBuildTarget, string | undefined>>>;
    readonly inventory: () => Promise<PluginSourceInventory>;
    readonly binding: RuntimeAssetBinding;
    readonly pack: PluginPack;
}
export declare function pluginProgramsBuild(options: PluginProgramBuildOptions): Plugin;
//# sourceMappingURL=plugin-programs.d.ts.map