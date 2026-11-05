import type { NativeCooker } from '@forgeax/engine-pack/native-cooker';
import type { ToolRunOptions, ToolTerminal } from '@forgeax/engine-tool-runtime';
import type { Importer } from '@forgeax/engine-types';
import type { InlineConfig } from 'vite';
import type { DevKitAppOptions, DevKitDeliveryOptions } from '../plugin-build.js';
import type { ProjectFacts } from '../types.js';
import { type PluginSourceInventory } from './plugin-assets.js';
export interface ProjectCookers {
    readonly appOptions: DevKitAppOptions;
    readonly delivery: DevKitDeliveryOptions;
    readonly cookers: readonly NativeCooker[];
    readonly importers: readonly Importer[];
    readonly watchFiles: ReadonlySet<string>;
    runTool?(id: string, args: unknown, options?: ToolRunOptions): Promise<ToolTerminal<unknown>>;
    dispose(): Promise<void>;
}
export interface BuildSessionDeadlines {
    readonly startupTimeoutMs?: number;
    readonly operationTimeoutMs?: number;
    readonly cleanupTimeoutMs?: number;
}
/** Project code, native registry and each original cook function stay in one killable process. */
export declare function loadProjectCookers(facts: ProjectFacts, builtins: readonly NativeCooker[], resolution?: Pick<InlineConfig, 'resolve' | 'plugins'>, options?: BuildSessionDeadlines & {
    readonly inventory?: PluginSourceInventory;
}): Promise<ProjectCookers>;
//# sourceMappingURL=cookers.d.ts.map