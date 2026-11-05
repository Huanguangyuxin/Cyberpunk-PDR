import { type Result } from '@forgeax/engine-types';
import { type TemplateDescriptor, type TemplateValidation } from './descriptor.js';
interface ProjectIdentity {
    readonly id: string;
    readonly name: string;
    readonly packageName: string;
}
interface ProjectIdentityOverrides {
    readonly id?: string;
    readonly name?: string;
    readonly packageName?: string;
}
interface ProjectIdentityInput {
    readonly targetBasename: string;
    readonly descriptor: Pick<TemplateDescriptor, 'defaultIdentity'>;
    readonly overrides?: ProjectIdentityOverrides;
}
type ProjectIdentityError = {
    readonly code: 'project-identity-invalid';
    readonly expected: string;
    readonly hint: string;
    readonly detail: {
        readonly field: 'target' | 'id' | 'name' | 'packageName' | 'templateDefault';
        readonly received?: string;
    };
};
/**
 * Resolve the generated project identity before any target-side effects.
 *
 * Template defaults provide the package namespace, while the target basename
 * is the default project identity. Explicit values win field-by-field.
 */
export declare function resolveProjectIdentity(input: ProjectIdentityInput): Result<ProjectIdentity, ProjectIdentityError>;
/** Read and validate the descriptor copied with one SDK template. */
export declare function readTemplateDescriptor(templateRoot: string): Promise<TemplateValidation>;
/** Rewrite the authoritative top-level project identities in a staged copy. */
export declare function writeProjectIdentity(root: string, identity: ProjectIdentity): Promise<void>;
export {};
//# sourceMappingURL=materialize.d.ts.map