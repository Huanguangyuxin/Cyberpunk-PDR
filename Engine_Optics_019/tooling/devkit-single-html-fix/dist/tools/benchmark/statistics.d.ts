export interface SampleStatistics {
    readonly count: number;
    readonly median: number;
    readonly p95: number;
    readonly max: number;
}
export declare function calculateSampleStatistics(samples: readonly number[]): SampleStatistics;
//# sourceMappingURL=statistics.d.ts.map