import type { MigrationCapabilityProbe, MigrationOperation } from '@forgeax/engine-tool-runtime';
import { type ArtifactRef, capabilityUnavailableError, type ServiceCapability, type ToolRealm } from '@forgeax/engine-tool-runtime';
export { createCapabilityToken, createMigrationRecipe, type MigrationCapabilityProbe, type MigrationOperation, type MigrationRecipe, probeMigrationTarget, } from '@forgeax/engine-tool-runtime';
export type MigrationPath = 'private' | 'service';
export interface MigrationTarget extends MigrationCapabilityProbe {
}
export interface MigrationRosterEntry {
    readonly operation: MigrationOperation;
    readonly owner: string;
    readonly realm: ToolRealm;
    readonly artifacts: readonly MigrationEvidence[];
    readonly benefit: string;
    readonly fallback: 'private';
}
export interface MigrationEvidence {
    readonly owner: string;
    readonly source: 'M3';
    readonly ref: ArtifactRef;
}
export interface MigrationResolution {
    readonly path: MigrationPath;
    readonly operation: MigrationOperation;
    readonly owner: string;
    readonly artifacts: readonly MigrationEvidence[];
    readonly service: ServiceCapability;
}
export type MigrationResolutionResult = {
    readonly ok: true;
    readonly value: MigrationResolution;
} | {
    readonly ok: false;
    readonly error: ReturnType<typeof capabilityUnavailableError>;
};
export declare function createMigrationRoster(): readonly MigrationRosterEntry[];
export declare function resolveMigration(entries: readonly MigrationRosterEntry[], operation: MigrationOperation, target: MigrationTarget): MigrationResolutionResult;
//# sourceMappingURL=migration.d.ts.map