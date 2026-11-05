import { type EngineWorkspacePreview, type EngineWorkspaceProvider } from '@forgeax/engine-app';
import { type CatalogSource } from '@forgeax/engine-assets-runtime';
import { type PackDraftReply } from '@forgeax/engine-pack/source';
/** Node author owner composes existing source execution and exact browser preview capabilities. */
export declare function createWorkspacePackAuthoring(options: {
    readonly root: string;
    readonly sourceRoots: readonly string[];
    readonly catalog?: () => CatalogSource | undefined;
    readonly preview: (targetId: string) => EngineWorkspacePreview | undefined;
    readonly publishSource?: (sourcePath: string) => Promise<void>;
    readonly changed?: (reply: PackDraftReply) => void;
}): {
    execute(input: Parameters<NonNullable<EngineWorkspaceProvider["authorPack"]>>[0]): Promise<import("@forgeax/engine-app").PackDraftSnapshot | import("@forgeax/engine-pack/build").PackDraftUpdate | {
        closed: string;
    }>;
    sourceChanged(path: string): Promise<boolean>;
    dispose(): void;
};
//# sourceMappingURL=workspace-pack-authoring.d.ts.map