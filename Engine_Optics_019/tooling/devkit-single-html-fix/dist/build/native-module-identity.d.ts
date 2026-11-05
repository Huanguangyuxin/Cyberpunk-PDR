/** Hash actual installed package instances, including runtime peers and type-only subdirectories. */
export declare function nativeModuleIdentity(url: string): Promise<string>;
/** Locate the actual resolved instance through dependency edges, independently of installation layout. */
export declare function nativeModuleKey(projectRoot: string, url: string, importer?: string): Promise<string>;
/** Replay the same logical dependency route against this Host's installation. */
export declare function resolveNativeModuleKey(projectRoot: string, key: string): Promise<string>;
//# sourceMappingURL=native-module-identity.d.ts.map