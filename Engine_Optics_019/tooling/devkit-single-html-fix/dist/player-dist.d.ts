import type { DistManifest } from './dist.js';
import { type PlayerBundleResult } from './player-bundles.js';
/** Build-root delivery declaration, consumed by player packaging and never shipped. */
export declare const PLAYER_DELIVERY_FILE = "forgeax-delivery.json";
/** Prepare delivery bytes without changing the verified build's diagnostic evidence. */
export declare function preparePlayerDist(sourceRoot: string, manifest: DistManifest): Promise<{
    readonly root: string;
    readonly manifest: DistManifest;
    readonly bundles: PlayerBundleResult['report'];
}>;
//# sourceMappingURL=player-dist.d.ts.map