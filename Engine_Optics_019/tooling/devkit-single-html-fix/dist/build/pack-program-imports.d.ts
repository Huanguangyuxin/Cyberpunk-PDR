import type { PackProgramImport } from '@forgeax/engine-pack/runtime';
export declare const PACK_PROGRAM_ENGINE_IMPORTS: readonly ["@forgeax/engine/ecs", "@forgeax/engine/scene", "@forgeax/engine/geometry", "@forgeax/engine/plugin", "@forgeax/engine/pack/source", "@forgeax/engine/types"];
/** One code identity for the delivered Engine closure, independent of checkout location. */
export declare function runtimeProgramIdentity(manifestPath: string): Promise<string>;
/** Native Node imports resolve to the same installed modules as the owning Host. */
export declare function createNodePackProgramImports(root: string, specifiers?: readonly string[]): Promise<Readonly<Record<string, PackProgramImport>>>;
/** Shared by native compilation and standalone restore; preserves the owning Host's module selection. */
export declare function resolveNodePackProgramImport(root: string, specifier: string, engineIdentity?: string): Promise<PackProgramImport>;
//# sourceMappingURL=pack-program-imports.d.ts.map