import type { ExecFileOptions } from 'node:child_process';
interface CommandInvocation {
    readonly file: string;
    readonly args: readonly string[];
    readonly options: Pick<ExecFileOptions, 'windowsVerbatimArguments'>;
}
interface CommandOutput {
    readonly stdout: string;
    readonly stderr: string;
}
/** Keep executable-format differences at one boundary for all DevKit commands. */
export declare function commandInvocation(command: string, args: readonly string[], platform?: NodeJS.Platform, comSpec?: string): CommandInvocation;
export declare function execFileCommand(command: string, args: readonly string[], options?: ExecFileOptions): Promise<CommandOutput>;
export {};
//# sourceMappingURL=child-process.d.ts.map