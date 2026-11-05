import type { BackendHost } from '@forgeax/engine-host/backend';
import { type HostAssembly } from '@forgeax/engine-host/protocol';
/** A project server borrows transport and authority; it never disposes the owner. */
export interface DevKitHostBinding {
    /** An author session consumes preview edits; saved sources still republish the Catalog. */
    readonly authoringSourceChanged?: (sourcePath: string) => boolean | Promise<boolean>;
    readonly backend: BackendHost;
    /** Optional connection projection; does not mutate the borrowed Host's assembly. */
    readonly frontendAssembly?: HostAssembly | undefined;
    /** Trusted immutable module supplied by the frontend owner, separate from wire program identity. */
    readonly frontendModule?: {
        readonly specifier: string;
        readonly export?: string;
        /** Native plugin export activated in the frontend Context before connecting the Host. */
        readonly prepare?: string;
    } | undefined;
    readonly workspace?: {
        /** Game projections borrow the backend without contributing to its default frontend. */
        readonly execution?: 'preview' | 'game';
        readonly sessionId: string;
        readonly targetId: string;
        readonly admissionToken: string;
    };
}
declare module '@forgeax/engine-plugin' {
    interface EngineContextServices {
        devkitHostBinding: DevKitHostBinding;
    }
}
export declare function hostBindingError(reason: string): never;
export declare function validateHostBinding(binding: DevKitHostBinding): void;
export declare function composeBoundHostAssembly(binding: DevKitHostBinding, project: HostAssembly): HostAssembly;
//# sourceMappingURL=host-binding.d.ts.map