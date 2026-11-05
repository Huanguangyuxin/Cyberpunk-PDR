import type { CommandResult } from './types.js';
export interface SdkInstallOptions {
    readonly root: string;
    readonly version?: string;
}
export declare function sdkInstallCommand(options: SdkInstallOptions): Promise<CommandResult<unknown>>;
//# sourceMappingURL=sdk-install.d.ts.map