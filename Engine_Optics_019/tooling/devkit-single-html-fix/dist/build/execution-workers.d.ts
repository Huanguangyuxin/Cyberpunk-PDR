import { type Plugin } from 'vite';
export declare const engineCapabilityMeta = "forgeax.engineCapability";
export interface EngineCapabilityMeta {
    readonly specifier: string;
    readonly reference?: string;
}
/** Keep runtime entries and URL-loaded project plugins in one module graph. */
export declare function executionWorkerEntries(runtimeImports?: readonly string[], delivery?: 'browser' | 'native'): Plugin;
//# sourceMappingURL=execution-workers.d.ts.map