import { type AdmissionThresholds, type BenchmarkAdmissionReport, type BenchmarkRecipe, type BenchmarkSample } from './report.js';
export type BenchmarkMeasurement = Pick<BenchmarkSample, 'durationMs' | 'peakRssBytes' | 'cleanupPassed' | 'evictionPassed'> & Partial<Pick<BenchmarkSample, 'exclusivePhasesMs' | 'rhiDebugOverheadMs' | 'carrierRendezvousMs'>>;
export interface BenchmarkHarnessOptions {
    readonly recipe: BenchmarkRecipe;
    readonly measure: (mode: BenchmarkSample['mode'], phase: BenchmarkSample['phase'], index: number) => Promise<BenchmarkMeasurement> | BenchmarkMeasurement;
    readonly thresholds?: AdmissionThresholds;
}
export declare function runBenchmarkAdmission(options: BenchmarkHarnessOptions): Promise<BenchmarkAdmissionReport>;
//# sourceMappingURL=harness.d.ts.map