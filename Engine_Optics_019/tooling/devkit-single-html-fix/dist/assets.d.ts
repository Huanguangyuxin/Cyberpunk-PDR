import type { AssetAddOptions, AssetInspectOptions, AssetListOptions, AssetResolveOptions, CommandResult, ProjectCommandOptions } from './types.js';
export declare function assetAddCommand(options: AssetAddOptions): Promise<CommandResult<unknown>>;
export declare function assetListCommand(options?: AssetListOptions): Promise<CommandResult<unknown>>;
export declare function assetVerifyCommand(options?: ProjectCommandOptions): Promise<CommandResult<unknown>>;
export declare function assetInspectCommand(options: AssetInspectOptions): Promise<CommandResult<unknown>>;
/** CLI convenience adapter for the Pack-owned asset.resolve operation. */
export declare function assetResolveCommand(options?: AssetResolveOptions): Promise<CommandResult<unknown>>;
//# sourceMappingURL=assets.d.ts.map