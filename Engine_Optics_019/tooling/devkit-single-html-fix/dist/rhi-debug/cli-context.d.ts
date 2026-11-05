import type { CommandResult } from '../types.js';
import { type RhiDebugOperationContext, type RhiInspectInput, type RhiInspectOutput, type RhiReadInput, type RhiReadOutput, type RhiSummaryOutput, type RhiTimingOutput } from './operations.js';
export declare function createCliRhiDebugOperationContext(): RhiDebugOperationContext;
interface CliOutputs {
    readonly 'rhi.summary': RhiSummaryOutput;
    readonly 'rhi.inspect': RhiInspectOutput;
    readonly 'rhi.read': RhiReadOutput;
    readonly 'rhi.timing': RhiTimingOutput;
}
/** Resolve a file once, then retain its identity throughout decoding and replay. */
export declare function runCliRhiDebugOperation<N extends keyof CliOutputs>(name: N, input: Omit<RhiInspectInput, 'artifact' | 'workIndex'> & Partial<Omit<RhiReadInput, 'artifact'>> & {
    readonly artifact: string;
    readonly digest?: string;
    readonly workIndex?: number;
}): Promise<CommandResult<CliOutputs[N]>>;
export {};
//# sourceMappingURL=cli-context.d.ts.map