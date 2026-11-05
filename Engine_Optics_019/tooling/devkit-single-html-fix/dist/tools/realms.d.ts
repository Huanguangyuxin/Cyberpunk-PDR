declare const RESOURCE_KINDS: readonly ["process", "port", "page", "canvas", "fiber"];
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export interface ResourceProbe {
    readonly observe: (kind: ResourceKind, id: string) => void;
    readonly release: (kind: ResourceKind, id: string) => void;
    readonly owner: (id: string) => ResourceOwner;
    readonly snapshot: () => Readonly<Record<ResourceKind, readonly string[]>>;
}
export interface ResourceOwner {
    readonly id: string;
    readonly observe: (kind: ResourceKind, resourceId: string) => void;
    readonly release: (kind: ResourceKind, resourceId: string) => void;
    readonly stop: () => void;
}
export declare function createResourceProbe(): ResourceProbe;
export {};
//# sourceMappingURL=realms.d.ts.map