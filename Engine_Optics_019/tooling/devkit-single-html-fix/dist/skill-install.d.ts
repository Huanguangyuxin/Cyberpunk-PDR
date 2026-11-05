import type { SdkContext } from './sdk.js';
import type { CommandResult, ProjectCommandOptions } from './types.js';
export declare const PROJECT_SKILL_MOUNT_ROOTS: readonly string[];
export interface SkillInstallReport {
    readonly root: string;
    readonly sourceRoot: string;
    readonly manifest: string;
    readonly skills: readonly string[];
    readonly mountRoots: readonly string[];
}
export declare function copySdkSkills(sdk: SdkContext, projectRoot: string): Promise<void>;
export declare function installedProjectSkillDirectories(root: string): Promise<readonly string[]>;
export declare function installProjectSkills(root: string, provenance?: Pick<SdkContext['manifest'], 'sdkVersion' | 'engineCommit'>): Promise<SkillInstallReport>;
export declare function verifyProjectSkills(root: string): Promise<SkillInstallReport>;
export declare function skillInstallCommand(options?: ProjectCommandOptions): Promise<CommandResult<SkillInstallReport>>;
export declare function skillVerifyCommand(options?: ProjectCommandOptions): Promise<CommandResult<SkillInstallReport>>;
//# sourceMappingURL=skill-install.d.ts.map