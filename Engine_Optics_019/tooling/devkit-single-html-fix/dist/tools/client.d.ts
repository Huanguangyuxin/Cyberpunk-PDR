import { Context } from '@forgeax/engine-plugin';
import { type ToolApi, type ToolCommandRegistry, type ToolContribution, type ToolRunOptions, type ToolTerminal } from '@forgeax/engine-tool-runtime';
import { type ToolCatalogEntry, type ToolRealmOwner } from './catalog.js';
import type { ProjectToolBinding, ProjectToolDiscoveryOptions } from './project-tools.js';
export interface ToolClientOptions extends ProjectToolDiscoveryOptions {
    readonly projectRoot: string;
    /** Existing Cordis root that owns this command client's provider Fibers. */
    readonly context?: Context;
    /** Optional physical realm owners used by a host/carrier integration. */
    readonly realmOwners?: readonly ToolRealmOwner[];
    /** Injectable builtins for physical host tests and alternate Engine adapters. */
    readonly baseContributions?: readonly ToolContribution[];
    readonly projectDiscovery?: (projectRoot: string) => Promise<readonly ProjectToolBinding[]>;
    /** Use the Tool API owned by an existing Host when one is available. */
    readonly toolApi?: ToolApi;
}
export interface ToolClient extends Pick<ToolCommandRegistry, 'help' | 'tree'> {
    readonly list: () => readonly ToolCatalogEntry[];
    readonly describe: (id: string) => ToolCatalogEntry | undefined;
    readonly runPath: <TResult = unknown>(path: readonly string[] | string, args: unknown, options?: ToolRunOptions) => Promise<ToolTerminal<TResult>>;
    readonly run: <TResult = unknown>(id: string, args: unknown, options?: ToolRunOptions) => Promise<ToolTerminal<TResult>>;
    readonly dispose?: () => Promise<void>;
}
export declare function createToolClient(options: ToolClientOptions): Promise<ToolClient>;
//# sourceMappingURL=client.d.ts.map