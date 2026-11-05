import type { DistArtifact } from './dist.js';
import type { DevKitDeliveryOptions } from './plugin-build.js';
/** Automatic Bundles stop splitting at this size; one Pack is never split. */
export declare const AUTO_BUNDLE_TARGET_BYTES: number;
export interface PlayerBundleInput {
    readonly sourceRoot: string;
    readonly outputRoot: string;
    /** Player artifacts after receipt removal, keyed by dist-relative path. */
    readonly artifacts: ReadonlyMap<string, DistArtifact>;
    readonly catalog: unknown;
    /** Resolve a catalog or Pack URL to its dist-relative artifact path. */
    readonly pathOf: (url: string, from: string) => string | undefined;
    readonly packIndexPath: string;
    readonly delivery: DevKitDeliveryOptions;
    readonly targetBytes?: number;
}
export interface PlayerBundleResult {
    /** Bundled originals that the player package omits. */
    readonly removed: ReadonlySet<string>;
    /** Rewritten Pack documents and new Bundle files, already written to outputRoot. */
    readonly written: readonly DistArtifact[];
    readonly report: {
        readonly bundles: number;
        readonly entries: number;
        readonly storedBytes: number;
        readonly sourceBytes: number;
    };
}
/** Group each Pack's non-stream artifacts into Bundles; shared bytes are stored once. */
export declare function planPlayerBundles(input: PlayerBundleInput): Promise<PlayerBundleResult>;
//# sourceMappingURL=player-bundles.d.ts.map