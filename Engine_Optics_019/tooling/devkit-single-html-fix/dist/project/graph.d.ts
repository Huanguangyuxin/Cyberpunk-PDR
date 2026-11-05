import type { ProjectFacts } from '../types.js';
export type ProjectLintRuleId = 'project-legacy-field' | 'project-schema-invalid' | 'project-reader-error' | 'project-realm-invalid' | 'project-ownership-orphan';
export interface ProjectLintDiagnostic {
    readonly ruleId: ProjectLintRuleId;
    readonly ownerPath: string;
    readonly expected: string;
    readonly hint: string;
    readonly detail: Readonly<Record<string, unknown>>;
}
export interface ProjectOwnershipNode {
    readonly module: string;
    readonly ownerPath: string;
    readonly realm: import('@forgeax/engine-types').PluginBuildTarget;
    readonly source: 'plugin-asset';
}
export interface ProjectOwnershipGraph {
    readonly ownership: readonly ProjectOwnershipNode[];
    readonly diagnostics: readonly ProjectLintDiagnostic[];
}
/** Asset/module ownership is static; native inject/provide readiness belongs to Cordis. */
export declare function buildProjectOwnershipGraph(facts: ProjectFacts): Promise<ProjectOwnershipGraph>;
//# sourceMappingURL=graph.d.ts.map