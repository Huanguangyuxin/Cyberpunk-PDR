import type { ToolTerminal } from '@forgeax/engine-tool-runtime';
/**
 * Run one SceneAsset preview through the same Engine workspace provider used
 * by display host. The CLI owns only the short-lived browser/session adapters; the
 * browser page owns App, World, AssetRegistry, scene instantiation and the
 * observation camera.
 */
export declare function runScenePreviewTool(args: unknown, projectRoot: string): Promise<ToolTerminal<unknown>>;
//# sourceMappingURL=scene-preview.d.ts.map