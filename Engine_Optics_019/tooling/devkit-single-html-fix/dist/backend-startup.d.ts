/** Best-effort internal diagnostics must never change startup or disposal outcomes. */
export declare function logBackendStartup(record: Readonly<Record<string, string | number | undefined>>, descriptor?: number): void;
/** Internal daemon diagnostics; ordinary API/CLI consumers keep their existing output. */
export declare function traceBackendStartup<T>(stage: string, operation: () => Promise<T>): Promise<T>;
//# sourceMappingURL=backend-startup.d.ts.map