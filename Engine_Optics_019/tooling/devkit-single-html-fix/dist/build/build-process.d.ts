import type { ToolRunOptions } from '@forgeax/engine-tool-runtime';
import type { ImportContext, ImportProduct } from '@forgeax/engine-types';
import { type PluginAssetDefinition } from '@forgeax/engine-types';
/** Only serializable requests and producer outputs cross this process boundary. */
export type BuildProcessRequest = {
    readonly id: number;
    readonly operation: 'start';
    readonly entry: string;
    readonly root: string;
    readonly definitions: readonly PluginAssetDefinition[];
    readonly sessionId: string;
} | {
    readonly id: number;
    readonly operation: 'cook';
    readonly key: string;
    readonly input: unknown;
} | {
    readonly id: number;
    readonly operation: 'import';
    readonly key: string;
    readonly context: Pick<ImportContext, 'source' | 'subAssets' | 'importSettings' | 'sourceOverrides'>;
} | {
    readonly id: number;
    readonly operation: 'decodeImage';
    readonly key: string;
    readonly args: Parameters<ImportContext['decodeImage']>;
} | {
    readonly id: number;
    readonly operation: 'publish';
    readonly key: string;
    readonly input: {
        readonly importSettings: Readonly<Record<string, unknown>>;
        readonly subAssets: ImportContext['subAssets'];
    };
} | {
    readonly id: number;
    readonly operation: 'finalize';
    readonly key: string;
    readonly product: ImportProduct<unknown>;
    readonly urls: Readonly<Record<string, string>>;
} | {
    readonly id: number;
    readonly operation: 'tool';
    readonly tool: string;
    readonly args: unknown;
    readonly options: Omit<ToolRunOptions, 'signal' | 'capabilityResolver' | 'owner' | 'caller'>;
} | {
    readonly id: number;
    readonly operation: 'cancelTool';
    readonly run: number;
} | {
    readonly id: number;
    readonly operation: 'dispose';
};
export interface BuildImporterDescriptor {
    readonly key: string;
    readonly decodeImage: boolean;
    readonly publish: boolean;
    readonly finalize: boolean;
}
export interface BuildCallbackRequest {
    readonly callback: number;
    readonly request: number;
    readonly operation: 'readSource' | 'readSibling' | 'decodeImage';
    readonly args: readonly unknown[];
}
//# sourceMappingURL=build-process.d.ts.map