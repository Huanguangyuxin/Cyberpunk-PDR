import type { ExecutionReport } from '@forgeax/engine-app';
interface PlayerState {
    readonly position: readonly number[];
    readonly grounded: boolean;
    readonly camera: {
        readonly yaw: number;
        readonly pitch: number;
        readonly pointerLocked: boolean;
    };
    readonly simulation: {
        readonly fixedTick: number;
    };
    readonly animation: {
        readonly walkWeight: number;
        readonly walkTime: number;
    };
}
declare global {
    var __forgeaxWorkerEvents: unknown[] | undefined;
    var __forgeaxWorkerPresentation: {
        latestCompleted?: unknown;
        readyCount: number;
        firstReadyAtMs?: number;
        loadingWaitStartedAtMs?: number;
    } | undefined;
    var __forgeaxGameInspection: {
        list(): Promise<{
            reads: string[];
        }>;
        read(id: string): Promise<PlayerState>;
        renderer(): {
            state: string;
            execution: ExecutionReport;
        };
    } | undefined;
}
export {};
//# sourceMappingURL=new-project-workers.e2e.test.d.ts.map