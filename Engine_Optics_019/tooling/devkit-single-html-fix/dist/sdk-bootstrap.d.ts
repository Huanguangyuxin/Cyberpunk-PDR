import type { SdkContext } from './sdk.js';
import type { CommandResult } from './types.js';
declare const SDK_INIT_SCHEMA_VERSION: "2.0.0";
interface SdkInitState {
    readonly schemaVersion: typeof SDK_INIT_SCHEMA_VERSION;
    readonly sdkVersion: string;
    readonly engineCommit: string;
    readonly toolInputsDigest: string;
    readonly pnpm: string;
    readonly node: string;
    readonly platform: NodeJS.Platform;
    readonly arch: string;
}
interface SdkInitReport extends SdkInitState {
    readonly root: string;
    readonly store: 'offline' | 'registry';
    readonly onboarding: AgentOnboarding;
}
interface AgentOnboarding {
    readonly read: readonly string[];
    readonly templateSelection?: {
        readonly required: true;
        readonly available: readonly string[];
    };
    readonly next?: {
        readonly cwd: string;
        readonly argv: readonly string[];
    };
}
export declare function agentOnboarding(sdk: SdkContext, projectRoot?: string): AgentOnboarding;
export declare function sdkProjectInstallArgs(store: string | undefined): string[];
export declare const MINIMUM_SUPPORTED_PNPM = "12.10.1";
export declare function pnpmVersionAtLeast(version: string, minimum: string): boolean;
export declare function requireSdkInitialization(sdk: SdkContext): Promise<CommandResult<SdkInitState>>;
export declare function sdkInitCommand(sdk: SdkContext, options?: {
    readonly dryRun?: boolean;
    readonly install?: boolean;
}): Promise<CommandResult<SdkInitReport>>;
export {};
//# sourceMappingURL=sdk-bootstrap.d.ts.map