interface SdkPackage {
    readonly role: 'runtime' | 'tool';
    readonly name: string;
    readonly version: string;
    readonly root: string;
    readonly fileCount: number;
    readonly byteCount: number;
}
interface SdkTemplate {
    readonly id: string;
    readonly root: string;
}
export interface SdkSkill {
    readonly id: string;
    readonly root: string;
    readonly fileCount: number;
    readonly byteCount: number;
}
interface SdkSourceWasm {
    readonly package: string;
    readonly root: string;
    readonly files: readonly string[];
}
interface SdkResource {
    readonly id: string;
    readonly package: string;
    readonly sourceRoot: string;
    readonly packageRoot: string;
    readonly files: readonly string[];
}
interface SdkTemplateResource {
    readonly id: string;
    readonly root: string;
    readonly files: readonly string[];
}
interface SdkSource {
    readonly root: 'source/engine';
    readonly format: 'git-archive-public-snapshot';
    readonly excluded: readonly ['.gitmodules', 'forgeax-engine-assets'];
    readonly gitDependencies: readonly {
        readonly root: 'third_party/wgpu' | 'third_party/blitz' | 'tools/view';
        readonly commit: string;
    }[];
    readonly fileCount: number;
    readonly byteCount: number;
    readonly prebuiltWasm: readonly SdkSourceWasm[];
}
export interface SdkManifest {
    readonly viewCommit: string;
    readonly schemaVersion: '1.9.0';
    readonly sdkVersion: string;
    readonly engineCommit: string;
    readonly requirements: {
        readonly node: string;
        readonly pnpm: string;
        readonly pnpmStoreFormat: string;
    };
    readonly capabilities: readonly string[];
    readonly packages: readonly SdkPackage[];
    readonly templates: readonly SdkTemplate[];
    readonly skills: readonly SdkSkill[];
    readonly resources: readonly SdkResource[];
    readonly templateResources: readonly SdkTemplateResource[];
    readonly source: SdkSource;
}
export interface SdkContext {
    readonly root: string;
    readonly manifest: SdkManifest;
    /**
     * The full ZIP carries an immutable offline store. The npm carrier is a
     * deliberately smaller online surface and omits it, so consumers fall back
     * to the registry when this path is absent.
     */
    readonly store?: string;
    readonly templates: ReadonlyMap<string, string>;
}
export declare function findSdkContext(): Promise<SdkContext | undefined>;
export {};
//# sourceMappingURL=sdk.d.ts.map