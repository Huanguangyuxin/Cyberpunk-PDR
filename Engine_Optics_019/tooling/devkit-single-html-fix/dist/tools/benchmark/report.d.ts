import { type SampleStatistics } from './statistics.js';
export interface BenchmarkRecipe {
    readonly snapshotDigest: string;
    readonly backend: string;
    readonly viewport: readonly [number, number];
    readonly inputDigest: string;
    readonly frameCount: number;
    readonly rhiDebug: boolean;
    readonly profiler: boolean;
    readonly carrierRendezvous: boolean;
    readonly digest: string;
}
export declare const BENCHMARK_MODES: readonly ["private", "service"];
export declare const BENCHMARK_PHASES: readonly ["cold", "warm"];
export interface BenchmarkSample {
    readonly mode: (typeof BENCHMARK_MODES)[number];
    readonly phase: (typeof BENCHMARK_PHASES)[number];
    readonly durationMs: number;
    readonly peakRssBytes: number;
    readonly exclusivePhasesMs: Readonly<Record<string, number>>;
    readonly rhiDebugOverheadMs: number;
    readonly carrierRendezvousMs: number;
    readonly cleanupPassed: boolean;
    readonly evictionPassed: boolean;
    readonly recipeDigest: string;
}
export interface BenchmarkModeReport {
    readonly samples: number;
    readonly durationMs: SampleStatistics;
    readonly peakRssBytes: SampleStatistics;
    readonly cleanupPassed: boolean;
    readonly evictionPassed: boolean;
    readonly exclusivePhasesMs: Readonly<Record<string, SampleStatistics>>;
}
export interface AdmissionThresholds {
    readonly sampleCountPerPhase: number;
    readonly medianImprovement: number;
    readonly p95Improvement: number;
    readonly maxRegression: number;
    readonly peakRssMultiplier: number;
}
export declare const DEFAULT_ADMISSION_THRESHOLDS: AdmissionThresholds;
export interface BenchmarkAdmissionReport {
    readonly schema: 'forgeax.tool-service-admission.v1';
    readonly recipe: BenchmarkRecipe;
    readonly thresholds: AdmissionThresholds;
    readonly order: readonly BenchmarkSample['mode'][];
    readonly private: BenchmarkModeReport;
    readonly service: BenchmarkModeReport;
    readonly valid: boolean;
    readonly admitted: boolean;
    readonly reasons: readonly string[];
}
export declare function summarizeBenchmarkSamples(samples: readonly BenchmarkSample[]): BenchmarkModeReport;
export declare function createAdmissionReport(recipe: BenchmarkRecipe, samples: readonly BenchmarkSample[], thresholds?: AdmissionThresholds): BenchmarkAdmissionReport;
//# sourceMappingURL=report.d.ts.map