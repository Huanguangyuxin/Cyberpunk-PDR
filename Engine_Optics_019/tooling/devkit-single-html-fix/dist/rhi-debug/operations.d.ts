import { type AtlasTile, type BufferRecordLayout, type BufferRecords, type DepthProjection, type DisplayOptions, type FrameSummary, type FrameTiming, type ImageLayout, type ImageStats, type InspectField, type ReadbackSubresource, type ReplayBackend, type ReplayReadbackResult, type RhiDebugError, type V7Tape, type WorkInspection, type WorkOutput } from '@forgeax/engine-rhi-debug';
import type { ToolJsonSchema } from '@forgeax/engine-tool-runtime';
import { type Result } from '@forgeax/engine-types';
import type { CommandResult } from '../types.js';
export declare const RHI_TAPE_ARTIFACT_KIND: "rhi-tape";
export interface ArtifactRef {
    readonly kind: typeof RHI_TAPE_ARTIFACT_KIND;
    readonly digest: string;
    readonly source: string;
    readonly path?: string;
}
export interface CapturedRhiTape extends ArtifactRef {
    readonly bytes: Uint8Array;
}
export interface RhiCaptureFrameValue {
    readonly kind: typeof RHI_TAPE_ARTIFACT_KIND;
    readonly digest: string;
    readonly bytes: Uint8Array;
    readonly source?: string;
    readonly path?: string;
}
export interface RhiCaptureInput {
    readonly signal?: AbortSignal;
}
export interface RhiSummaryInput {
    readonly artifact: ArtifactRef;
}
export interface RhiInspectInput {
    readonly artifact: ArtifactRef;
    readonly workIndex: number;
    readonly fields?: readonly InspectField[];
    readonly buffer?: {
        readonly resourceId: string;
        readonly layout: BufferRecordLayout;
        readonly first: number;
        readonly count: number;
    };
}
/**
 * One read of `rhi.read`: a resource by id, what `workIndex` bound at a
 * binding slot, or a named output that work wrote (`color0`, `depth`,
 * `@group(G)@binding(B)` from `rhi.inspect` outputs). `records` decodes typed
 * struct rows; `image` decodes texels (a buffer names its format and extent),
 * optionally linearizes depth, crops one atlas tile and writes a
 * display-mapped PNG to `image.png`.
 */
export interface RhiReadRequest {
    readonly resourceId?: string;
    readonly binding?: {
        readonly group: number;
        readonly binding: number;
    };
    readonly output?: string;
    /** Omit to read the pre-frame (bootstrap) contents. */
    readonly workIndex?: number;
    readonly subresource?: ReadbackSubresource;
    readonly records?: {
        readonly layout: BufferRecordLayout;
        readonly first: number;
        readonly count: number;
    };
    readonly image?: Partial<ImageLayout> & DisplayOptions & {
        readonly tile?: AtlasTile;
        readonly png?: string;
        /** Depth texels: grey without fields, view distance with a projection. */
        readonly depth?: true | DepthProjection;
    };
}
export interface RhiReadInput {
    readonly artifact: ArtifactRef;
    readonly reads: readonly RhiReadRequest[];
}
export interface RhiReadValue {
    readonly resourceId: string;
    readonly provenance: ReplayReadbackResult['provenance'];
    readonly byteLength: number;
    readonly digest: string;
    readonly records?: BufferRecords['records'];
    readonly image?: {
        readonly width: number;
        readonly height: number;
        readonly stats: ImageStats;
        readonly png?: string;
    };
}
export interface RhiReadOutput {
    readonly artifact: ArtifactRef;
    /** One result per request, in request order; a failed read never fails the batch. */
    readonly reads: readonly CommandResult<RhiReadValue>[];
}
export declare const RHI_READ_LIMIT = 64;
export interface RhiTimingOutput {
    readonly artifact: ArtifactRef;
    readonly timing: FrameTiming;
}
export type RhiDebugOperationName = 'rhi.capture' | 'rhi.summary' | 'rhi.inspect' | 'rhi.read' | 'rhi.timing';
export type RhiDebugOperationInput = RhiCaptureInput | RhiSummaryInput | RhiInspectInput | RhiReadInput;
export interface RhiSummaryOutput {
    readonly artifact: ArtifactRef;
    readonly summary: FrameSummary;
}
/** One `outputs` entry of `rhi.inspect`: what the work wrote, summarized by digest. */
export interface RhiInspectOutputRead extends Omit<WorkOutput, 'request'> {
    readonly read: CommandResult<RhiReadValue>;
}
export interface RhiInspectOutput {
    readonly artifact: ArtifactRef;
    readonly inspection: Omit<WorkInspection, 'outputs'> & {
        readonly outputs?: readonly RhiInspectOutputRead[];
    };
    readonly bufferRecords?: BufferRecords;
}
export type RhiDebugOperationOutput = ArtifactRef | RhiSummaryOutput | RhiInspectOutput | RhiReadOutput | RhiTimingOutput;
/** A replay backend the operation owns; `release` ends the fresh device after replay. */
export interface ReplayBackendLease extends ReplayBackend {
    readonly release: () => void;
}
export interface RhiDebugOperationContext {
    readonly captureFrame: (input?: RhiCaptureInput) => Promise<Result<CapturedRhiTape, RhiDebugError>>;
    readonly readArtifact: (artifact: ArtifactRef) => Promise<CommandResult<Uint8Array>>;
    readonly createReplayBackend?: (tape: V7Tape) => Promise<CommandResult<ReplayBackendLease>>;
    /** Writes `rhi.read` PNG previews; hosts without a filesystem omit it. */
    readonly writeFile?: (path: string, bytes: Uint8Array) => Promise<CommandResult<string>>;
}
export interface RhiDebugOperationHost {
    readonly captureFrame: (input?: RhiCaptureInput) => Promise<Result<RhiCaptureFrameValue, RhiDebugError>>;
    readonly readArtifact: (artifact: ArtifactRef) => Promise<CommandResult<Uint8Array>>;
    readonly createReplayBackend?: (tape: V7Tape) => Promise<CommandResult<ReplayBackendLease>>;
    readonly writeFile?: (path: string, bytes: Uint8Array) => Promise<CommandResult<string>>;
}
export declare function createRhiDebugOperationContext(host: RhiDebugOperationHost): RhiDebugOperationContext;
export interface RhiDebugOperationDescriptor {
    readonly name: RhiDebugOperationName;
    readonly summary: string;
    readonly inputSchema: ToolJsonSchema;
    readonly outputSchema: ToolJsonSchema;
    readonly recoveryCodes: readonly string[];
}
export interface RhiDebugOperationManifest {
    readonly schemaVersion: '1.0.0';
    readonly artifactRefSchema: ToolJsonSchema;
    readonly operations: readonly RhiDebugOperationDescriptor[];
}
export declare const RHI_INSPECT_INPUT_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly artifact: ToolJsonSchema;
        readonly workIndex: {
            readonly type: "integer";
            readonly minimum: 0;
        };
        readonly buffer: {
            readonly type: "object";
            readonly properties: {
                readonly resourceId: {
                    readonly type: "string";
                };
                readonly first: {
                    readonly type: "integer";
                    readonly minimum: 0;
                };
                readonly count: {
                    readonly type: "integer";
                    readonly minimum: 1;
                    readonly maximum: 4096;
                };
                readonly layout: ToolJsonSchema;
            };
            readonly required: readonly ["resourceId", "layout", "first", "count"];
            readonly additionalProperties: false;
        };
        readonly fields: {
            readonly type: "array";
            readonly items: {
                readonly type: "string";
                readonly enum: readonly ["bindings", "pipeline", "pixels", "outputs"];
            };
        };
    };
    readonly required: readonly ["artifact", "workIndex"];
    readonly additionalProperties: false;
};
export declare const RHI_READ_INPUT_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly artifact: ToolJsonSchema;
        readonly reads: {
            readonly type: "array";
            readonly minItems: 1;
            readonly maxItems: 64;
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly resourceId: {
                        readonly type: "string";
                    };
                    readonly binding: {
                        readonly type: "object";
                        readonly properties: {
                            readonly group: {
                                readonly type: "integer";
                                readonly minimum: 0;
                            };
                            readonly binding: {
                                readonly type: "integer";
                                readonly minimum: 0;
                            };
                        };
                        readonly required: readonly ["group", "binding"];
                        readonly additionalProperties: false;
                    };
                    readonly output: {
                        readonly type: "string";
                    };
                    readonly workIndex: {
                        readonly type: "integer";
                        readonly minimum: 0;
                    };
                    readonly subresource: {
                        readonly type: "object";
                        readonly additionalProperties: true;
                    };
                    readonly records: ToolJsonSchema;
                    readonly image: ToolJsonSchema;
                };
                readonly additionalProperties: false;
            };
        };
    };
    readonly required: readonly ["artifact", "reads"];
    readonly additionalProperties: false;
};
export declare const RHI_DEBUG_OPERATION_MANIFEST: RhiDebugOperationManifest;
export declare function discoverRhiDebugOperations(): readonly RhiDebugOperationDescriptor[];
export declare function renderRhiDebugHelp(): string;
export declare function recoverRhiDebugError(error: RhiDebugError): string;
export declare function runRhiDebugOperation(name: 'rhi.capture', input: RhiCaptureInput, context: RhiDebugOperationContext): Promise<CommandResult<ArtifactRef>>;
export declare function runRhiDebugOperation(name: 'rhi.summary', input: RhiSummaryInput, context: RhiDebugOperationContext): Promise<CommandResult<RhiSummaryOutput>>;
export declare function runRhiDebugOperation(name: 'rhi.inspect', input: RhiInspectInput, context: RhiDebugOperationContext): Promise<CommandResult<RhiInspectOutput>>;
export declare function runRhiDebugOperation(name: 'rhi.read', input: RhiReadInput, context: RhiDebugOperationContext): Promise<CommandResult<RhiReadOutput>>;
export declare function runRhiDebugOperation(name: 'rhi.timing', input: RhiSummaryInput, context: RhiDebugOperationContext): Promise<CommandResult<RhiTimingOutput>>;
export declare function runRhiDebugOperation(name: RhiDebugOperationName, input: RhiDebugOperationInput, context: RhiDebugOperationContext): Promise<CommandResult<RhiDebugOperationOutput>>;
//# sourceMappingURL=operations.d.ts.map