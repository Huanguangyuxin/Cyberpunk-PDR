import type { Plugin } from 'vite';
import type { DevKitAppOptions } from '../plugin-build.js';
import type { BuildOptions, ProjectFacts } from '../types.js';
import { type PluginSourceInventory } from './plugin-assets.js';
/** Native package preparation consumes the same SDK-owned payloads as public source builds. */
export declare function prepareWechatBuild(facts: ProjectFacts, generated: string, inventory: PluginSourceInventory, appOptions?: DevKitAppOptions): Promise<{
    plugin: Plugin<any>;
    entry: string;
}>;
export declare function writeWechatProject(facts: ProjectFacts, options: BuildOptions, outDir: string): Promise<void>;
/** Count deployed bytes, including the completed distribution manifest. */
export declare function verifyWechatPackageBudget(outDir: string): Promise<void>;
export declare function wechatHostSource(facts: ProjectFacts, native: string, rhiDebug?: boolean, appOptions?: DevKitAppOptions): string;
//# sourceMappingURL=wechat.d.ts.map