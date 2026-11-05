import type { SdkManifest } from './sdk.js';
import type { CommandResult, InitOptions, ProjectFacts } from './types.js';
export interface InitPlan {
    readonly root: string;
    readonly version: string;
    readonly pnpmVersion?: string;
    readonly archiveBacked: boolean;
    readonly dependencyChanges: readonly {
        readonly section: string;
        readonly name: string;
        readonly from?: string;
        readonly to: string;
    }[];
    readonly scriptChanges: readonly {
        readonly name: string;
        readonly to: string;
    }[];
}
export declare function createInitPlan(facts: ProjectFacts, sdk?: Pick<SdkManifest, 'sdkVersion' | 'packages' | 'requirements'>): CommandResult<InitPlan>;
export declare function applyInitPlan(facts: ProjectFacts, plan: InitPlan, options: InitOptions): Promise<CommandResult<InitPlan>>;
//# sourceMappingURL=init.d.ts.map