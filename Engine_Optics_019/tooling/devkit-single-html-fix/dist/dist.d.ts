import type { BuildOptions, CommandResult, ProjectFacts } from './types.js';
export interface DistArtifact {
    readonly path: string;
    readonly mediaType: string;
    readonly bytes: number;
    readonly sha256: string;
}
export interface DistManifest {
    readonly schemaVersion: '1.0.0';
    /** A partial validation build never claims the default portable material set. */
    readonly materialProfile?: BuildOptions['materialProfile'];
    /** Older distributions without a target are browser distributions. */
    readonly target?: BuildOptions['target'];
    readonly project: {
        readonly id: string;
        readonly name: string;
    };
    readonly base: string;
    readonly runtime: {
        readonly packIndexUrl: string;
        readonly shaderManifestUrl: string;
    };
    readonly artifacts: readonly DistArtifact[];
}
export declare function mediaType(path: string): string;
export declare function writeDistManifest(facts: ProjectFacts, base: string, rootInput?: string, target?: NonNullable<BuildOptions['target']>, materialProfile?: BuildOptions['materialProfile']): Promise<DistManifest>;
export declare function verifyDist(rootInput: string): Promise<CommandResult<DistManifest>>;
//# sourceMappingURL=dist.d.ts.map