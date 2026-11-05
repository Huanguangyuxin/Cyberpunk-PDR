import type { CommandResult, ProjectCommandOptions } from '../types.js';
export interface PluginMigrationOptions extends ProjectCommandOptions {
    /** A new project directory. The original project is never partially edited. */
    readonly output: string;
}
/** Deliberately recognizes the finite static Group form, never guesses dynamic composition. */
export declare function migrateStaticGroups(source: string, path: string): string;
export declare function pluginMigrateCommand(options: PluginMigrationOptions): Promise<CommandResult<unknown>>;
//# sourceMappingURL=migration.d.ts.map