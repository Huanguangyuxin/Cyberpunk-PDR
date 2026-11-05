import type { ProjectCommandOptions } from '../types.js';
import { type ProjectLintDiagnostic, type ProjectOwnershipGraph } from './graph.js';
export type { ProjectLintDiagnostic, ProjectLintRuleId, ProjectOwnershipGraph, ProjectOwnershipNode, } from './graph.js';
export interface ProjectLintReport extends ProjectOwnershipGraph {
    readonly root: string;
}
export interface ProjectLintError {
    readonly code: 'project-lint-failed';
    readonly expected: string;
    readonly hint: string;
    readonly detail: {
        readonly root: string;
        readonly diagnostics: readonly ProjectLintDiagnostic[];
    };
}
export type ProjectLintResult = {
    readonly ok: true;
    readonly value: ProjectLintReport;
} | {
    readonly ok: false;
    readonly error: ProjectLintError;
};
export declare function projectLintCommand(options?: ProjectCommandOptions): Promise<ProjectLintResult>;
//# sourceMappingURL=lint.d.ts.map