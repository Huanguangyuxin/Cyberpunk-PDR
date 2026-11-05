import { type PackProgram } from '@forgeax/engine-pack/runtime';
import { type Rolldown } from 'vite';
/** Archive the player's own transformed graph, without reevaluating its bootstrap. */
export declare class BrowserPluginProgramArchive {
    readonly entries: Map<string, string>;
    private readonly chunks;
    private readonly rendered;
    private readonly groups;
    recordRendered(code: string, chunk: Rolldown.RenderedChunk): void;
    /** Every provider's sidecar includes all selections and the exact Engine identity. */
    hash(engineIdentity: string): string;
    preserveModules(context: Rolldown.PluginContext): void;
    /** Coalesce only modules with identical static entry reachability; lazy boundaries survive. */
    prepareGroups(context: Rolldown.PluginContext): void;
    groupedOutput(output: Rolldown.OutputOptions): Rolldown.OutputOptions;
    /** A complete delivered graph contains every selected entry, regardless of its active export. */
    entryFiles(context: Rolldown.PluginContext): readonly string[];
    private capabilities;
    /** Delivery locators stay in the current Host, outside exported portable programs. */
    imports(context: Rolldown.PluginContext, engineIdentity: string): {
        [k: string]: {
            identity: string;
            url: string;
        };
    };
    capture(context: Rolldown.PluginContext, bundle: Rolldown.OutputBundle, engineIdentity: string): Readonly<Record<string, PackProgram>>;
}
//# sourceMappingURL=plugin-programs-browser.d.ts.map