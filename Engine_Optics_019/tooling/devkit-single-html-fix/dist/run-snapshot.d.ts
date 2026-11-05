export declare function runStateDirectory(projectRoot: string): string;
/** Reuse the snapshot dependency owner without copying files or publishing a run. */
export declare function inspectRunDependencyClosure(projectRoot: string, binding: {
    readonly schemaVersion: string;
    readonly path: string;
} | null, engineDigest: string | undefined, pnpmVersion: string): Promise<void>;
/** Retry short watcher races while preserving the fail-closed stable-input contract. */
export declare function createRunSnapshot(projectRoot: string, directory: string, signal?: AbortSignal): Promise<{
    readonly root: string;
    readonly version: string;
    readonly dispose: () => Promise<void>;
}>;
//# sourceMappingURL=run-snapshot.d.ts.map