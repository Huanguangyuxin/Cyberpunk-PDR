import { type PackProgram, type PackProgramError, type PackProgramSource } from '@forgeax/engine-pack/runtime';
import { type Result } from '@forgeax/engine-types';
/** Producer-only TS conversion; JavaScript takes the compiler-free Pack path. */
export declare function preparePackProgramSource(input: PackProgramSource): Result<PackProgram, PackProgramError>;
/** Preserve agent-created TS originals beside their executable JavaScript closure. */
export declare function prepareRuntimePackProgram(input: PackProgramSource): Result<import('@forgeax/engine-import').RuntimePackProgram, PackProgramError>;
//# sourceMappingURL=pack-program.d.ts.map