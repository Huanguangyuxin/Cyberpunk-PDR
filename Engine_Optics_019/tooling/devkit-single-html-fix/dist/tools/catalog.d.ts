import { type ToolApiProviderInput, type ToolApiRunOptions, type ToolContribution, type ToolDescriptor, type ToolJsonSchema, type ToolTerminal } from '@forgeax/engine-tool-runtime';
import type { BuildOptions, PluginCreateOptions, PluginInspectOptions, PluginRootOptions } from '../types.js';
import type { OfflineAnalysisRequest, OfflineAnalysisResult } from './offline-analysis.js';
import type { PreviewHostRequest, PreviewHostResult } from './preview-host.js';
export interface ToolCatalogAuthority {
    readonly authorityDigest?: string;
    readonly root?: string;
    readonly read?: () => Promise<ToolCatalogAuthoritySnapshot>;
    readonly projectionPath?: string;
}
export interface ToolCatalogAuthoritySnapshot {
    readonly authorityDigest: string;
    readonly descriptors: readonly ToolDescriptor[];
}
export interface ToolCatalogEntry extends Pick<ToolDescriptor, 'id' | 'title' | 'summary' | 'realm' | 'evidence'> {
    readonly path: readonly string[];
    readonly argsSchema?: string;
    readonly resultSchema?: string;
}
export interface ToolCatalog {
    readonly schemaVersion: '1.0.0';
    readonly authorityDigest: string;
    readonly digest: string;
    readonly entries: readonly ToolCatalogEntry[];
}
export type ToolCatalogLoadResult = {
    readonly ok: true;
    readonly value: ToolCatalog;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: 'tool-catalog-authority-unreadable' | 'tool-catalog-projection-invalid';
        readonly expected: string;
        readonly hint: string;
        readonly detail: Readonly<Record<string, string>>;
    };
};
/**
 * The public asset read paths use the same schema in the command tree and
 * in their Pack domain descriptors. Keeping these JSON shapes here prevents
 * help from advertising the lower-level request envelope to CLI callers.
 */
export declare const assetListInputSchema: ToolJsonSchema;
export declare const assetInspectInputSchema: ToolJsonSchema;
export declare const assetResolveInputSchema: ToolJsonSchema;
export declare const assetVerifyInputSchema: ToolJsonSchema;
/** The Pack domain owns these descriptors; DevKit only projects them. */
export declare const packAuthoringToolDescriptors: readonly ToolDescriptor[];
export declare const pluginMigrationDescriptor: ToolDescriptor<import('../plugin/migration.js').PluginMigrationOptions, unknown>;
export declare const projectBuildDescriptor: ToolDescriptor<BuildOptions, unknown>;
export declare const authorPluginCreateDescriptor: ToolDescriptor<PluginCreateOptions, unknown>;
export declare const authorPluginInspectDescriptor: ToolDescriptor<PluginInspectOptions, unknown>;
export declare const authorPluginRootDescriptor: ToolDescriptor<PluginRootOptions, unknown>;
export declare const previewRunDescriptor: ToolDescriptor<PreviewHostRequest, PreviewHostResult>;
export declare const previewOfflineAnalysisDescriptor: ToolDescriptor<OfflineAnalysisRequest, OfflineAnalysisResult>;
export declare const defaultToolDescriptors: readonly ToolDescriptor[];
export interface ToolRealmOwner extends Pick<ToolApiProviderInput, 'realm' | 'module'>, Partial<Pick<ToolApiProviderInput, 'sourceId' | 'providerId'>> {
    readonly contributions: ToolApiProviderInput['tools'];
}
export interface ToolRealmDispatch {
    readonly list: () => readonly ToolDescriptor[];
    readonly describe: (id: string) => ToolDescriptor | undefined;
    readonly run: <TResult = unknown>(id: string, args: unknown, options?: ToolApiRunOptions) => Promise<ToolTerminal<TResult>>;
    /** Disposes only the owner Fibers created for this dispatch. */
    readonly dispose: () => Promise<void>;
}
/**
 * Dispatches descriptors through real Cordis native plugin tool owners.
 *
 * A realm is only an execution classification. Multiple owners may publish the
 * same operation from different sources; callers must route those operations
 * explicitly through the source/provider pair returned by the owner contract.
 */
export declare function createRealmDispatch(contributions: readonly ToolContribution[], owners: readonly ToolRealmOwner[]): ToolRealmDispatch;
export declare function createProjectToolCatalogAuthority(rootInput: string, descriptors?: readonly ToolDescriptor[]): ToolCatalogAuthority;
export declare function loadToolCatalog(authority: ToolCatalogAuthority, descriptors?: readonly ToolDescriptor[]): Promise<ToolCatalogLoadResult>;
export declare function materializeToolCatalog<TArgs, TResult>(contributions: readonly ToolContribution<TArgs, TResult>[], authority: ToolCatalogAuthority): ToolCatalog;
export declare function materializeToolCatalog(contributions: readonly unknown[], authority: ToolCatalogAuthority): ToolCatalog;
export declare function materializeToolDescriptorCatalog(descriptors: readonly ToolDescriptor[], authority: ToolCatalogAuthority): ToolCatalog;
export declare function rebuildToolCatalog<TArgs, TResult>(contributions: readonly ToolContribution<TArgs, TResult>[], current: ToolCatalog | undefined, authority: ToolCatalogAuthority): ToolCatalog;
export declare function listTools(catalog: ToolCatalog): readonly ToolCatalogEntry[];
export declare function describeTool(catalog: ToolCatalog, id: string): ToolCatalogEntry | undefined;
//# sourceMappingURL=catalog.d.ts.map