import { type InlineConfig } from 'vite';
import type { ProjectFacts } from '../types.js';
import { type PluginSourceInventory } from './plugin-assets.js';
/** Build and resident Node realms share one compiler, portable graph and native module identity. */
export declare function compileNodePluginPrograms(facts: ProjectFacts, target: 'build' | 'host', inventory: PluginSourceInventory, temporary: string, resolution?: Pick<InlineConfig, 'resolve' | 'plugins'>, trace?: <T>(stage: string, operation: () => Promise<T>) => Promise<T>): Promise<{
    readonly entry: string;
    readonly watchFiles: ReadonlySet<string>;
}>;
//# sourceMappingURL=plugin-programs-node.d.ts.map