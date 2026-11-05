import { type ToolContribution } from '@forgeax/engine-tool-runtime';
import type { PluginSourceInventory } from '../build/plugin-assets.js';
import type { BuildOptions, PluginCreateOptions, PluginInspectOptions, PluginRootOptions } from '../types.js';
export declare function createBuildContribution(projectRoot?: string, takeInitialSources?: () => PluginSourceInventory | undefined): ToolContribution<BuildOptions, unknown>;
export declare function createAuthorContribution(projectRoot?: string): ToolContribution<PluginCreateOptions, unknown>;
export declare function createPackAuthoringContributions(projectRoot?: string): readonly ToolContribution<unknown, unknown>[];
export declare function createAuthorInspectContribution(projectRoot?: string): ToolContribution<PluginInspectOptions, unknown>;
export declare function createProjectRootContribution(projectRoot?: string): ToolContribution<PluginRootOptions, unknown>;
export declare function createDefaultContributions(projectRoot?: string, takeInitialSources?: () => PluginSourceInventory | undefined): (ToolContribution<unknown, unknown> | ToolContribution<BuildOptions, unknown> | ToolContribution<PluginCreateOptions, unknown> | ToolContribution<PluginInspectOptions, unknown> | ToolContribution<PluginRootOptions, unknown> | ToolContribution<import("../index.js").PluginMigrationOptions, unknown>)[];
//# sourceMappingURL=contributions.d.ts.map