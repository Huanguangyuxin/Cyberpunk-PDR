import type { Plugin } from '@forgeax/engine-plugin';
import { type ToolClient } from './tools/client.js';
/** The DevKit command surface is a Host capability, not a second CLI runtime. */
interface DevkitCliService {
    readonly ready: () => Promise<ToolClient>;
    readonly closed: () => boolean;
}
interface DevkitCliStartup {
    readonly plugin: Plugin;
    readonly service: DevkitCliService;
}
declare module '@forgeax/engine-plugin' {
    interface EngineContextServices {
        devkitCli: DevkitCliService;
    }
}
/**
 * Assemble the SDK command registry inside the same Cordis lifecycle used by
 * every other Host. The binary only owns startup/disposal; command discovery,
 * dispatch and project extension loading belong to this startup capability.
 */
export declare function createDevkitCliStartup(projectRoot: string): DevkitCliStartup;
export {};
//# sourceMappingURL=cli-host.d.ts.map