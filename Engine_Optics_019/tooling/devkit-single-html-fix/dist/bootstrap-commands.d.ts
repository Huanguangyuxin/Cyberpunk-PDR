import { type UiAuthoringProfile } from '@forgeax/engine-ui/authoring';
import type { CommandResult, InitOptions, NewOptions, ProjectCommandOptions } from './types.js';
export interface DoctorReport {
    readonly root: string;
    readonly projectId: string;
    readonly node: string;
    readonly pnpm: string;
    readonly workspaceDependencies: readonly string[];
    readonly uiAuthoringProfile: UiAuthoringProfile;
}
export declare function doctorCommand(options?: ProjectCommandOptions): Promise<CommandResult<DoctorReport>>;
export declare function initCommand(options?: InitOptions): Promise<CommandResult<unknown>>;
export declare function newCommand(options?: NewOptions): Promise<CommandResult<unknown>>;
//# sourceMappingURL=bootstrap-commands.d.ts.map