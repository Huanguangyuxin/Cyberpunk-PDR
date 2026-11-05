import type { CommandResult, PluginCreateOptions, PluginInspectOptions, PluginRootOptions } from './types.js';
export declare function pluginCreateCommand(options: PluginCreateOptions): Promise<CommandResult<unknown>>;
export declare function pluginInspectCommand(options?: PluginInspectOptions): Promise<CommandResult<unknown>>;
/** Replaces one root reference. Configuration remains in its owning Pack. */
export declare function pluginRootCommand(options: PluginRootOptions): Promise<CommandResult<unknown>>;
//# sourceMappingURL=plugin-authoring.d.ts.map