import type { PackProgramHostFactory } from '@forgeax/engine-pack/runtime';
export type { PackProgramHostFactory } from '@forgeax/engine-pack/runtime';
declare module '@forgeax/engine-host/platform' {
    interface FrontendPlatform {
        /** Borrowed realm module delivery when a native frontend cannot own a ServiceWorker. */
        readonly createPackProgramHost?: PackProgramHostFactory;
    }
}
//# sourceMappingURL=runtime-pack-platform.d.ts.map