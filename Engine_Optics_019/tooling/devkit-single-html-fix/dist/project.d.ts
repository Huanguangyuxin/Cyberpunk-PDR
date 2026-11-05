import type { CommandError, CommandResult, ProjectFacts } from './types.js';
export declare function isValidStartupTimeoutMs(value: unknown): value is number | null;
/** Read the shared project startup policy without requiring a forge.json project. */
export declare function readProjectStartupTimeoutMs(rootInput?: string): Promise<CommandResult<ProjectFacts['startupTimeoutMs']>>;
export declare function readProjectFacts(rootInput?: string): Promise<CommandResult<ProjectFacts>>;
export declare function commandError(cause: unknown, fallbackCode: string): CommandError;
//# sourceMappingURL=project.d.ts.map