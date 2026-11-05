import type { CommandError, CommandResult, ProjectCommandOptions } from './types.js';
export declare const ENGINE_BINDING_SCHEMA_VERSION: "1.0.0";
export type EngineBindingMode = 'sdk' | 'local';
export interface EngineBinding {
    readonly schemaVersion: typeof ENGINE_BINDING_SCHEMA_VERSION;
    readonly path: string;
}
/** One path-addressed byte in a package's consumed runtime payload. */
export interface EngineRuntimeFile {
    readonly path: string;
    readonly digest: string;
}
export interface EnginePackageStatus {
    readonly name: string;
    readonly root: string;
    readonly version: string;
    readonly entry: string | null;
    readonly built: boolean;
    readonly entryDigest: string | null;
    readonly manifestDigest: string;
    readonly runtimeDigest: string;
    readonly runtimeFiles: readonly EngineRuntimeFile[];
    readonly builtAt: string | null;
}
export interface EngineWorkspaceStatus {
    readonly root: string;
    readonly packageCount: number;
    readonly builtPackages: number;
    readonly missingBuilds: readonly string[];
    readonly versions: readonly string[];
    readonly packages: readonly EnginePackageStatus[];
    readonly digest: string;
    readonly builtAt: string | null;
}
export interface EngineStatusReport {
    readonly schemaVersion: typeof ENGINE_BINDING_SCHEMA_VERSION;
    readonly root: string;
    readonly binding: EngineBinding | null;
    readonly mode: EngineBindingMode;
    readonly resolved: {
        readonly root: string | null;
        readonly version: string | null;
        readonly entry: string | null;
        readonly built: boolean;
        readonly source: 'sdk' | 'local' | 'unresolved';
    };
    readonly workspace: EngineWorkspaceStatus | null;
    readonly projectDependencies: 'registry' | 'workspace' | 'mixed' | 'none';
    readonly npmCompatible: boolean;
    readonly healthy: boolean;
    readonly next: readonly string[];
    readonly diagnostic?: CommandError;
}
export interface EngineBindingCommandOptions extends ProjectCommandOptions {
    readonly path?: string;
    readonly dryRun?: boolean;
}
export declare function readEngineBinding(rootInput?: string): Promise<CommandResult<EngineBinding | null>>;
/** Byte identity for a selected installed package; shared with frontend source admission. */
export declare function enginePackageRuntimeIdentity(packageRoot: string): Promise<string>;
export declare function inspectEngineWorkspace(workspaceInput: string): Promise<CommandResult<EngineWorkspaceStatus>>;
export declare function engineStatusCommand(options?: EngineBindingCommandOptions): Promise<CommandResult<EngineStatusReport>>;
export declare function engineUseLocalCommand(options: EngineBindingCommandOptions): Promise<CommandResult<EngineStatusReport>>;
export declare function engineUnlinkCommand(options?: EngineBindingCommandOptions): Promise<CommandResult<EngineStatusReport>>;
export declare function engineDoctorCommand(options?: EngineBindingCommandOptions): Promise<CommandResult<EngineStatusReport>>;
export declare function engineBindingFilePath(rootInput?: string): string;
//# sourceMappingURL=engine-binding.d.ts.map