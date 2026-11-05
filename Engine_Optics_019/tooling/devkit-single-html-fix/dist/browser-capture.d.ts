import { type Page } from 'playwright';
import { type DevKitHostBinding } from './host-binding.js';
import type { BrowserCarrierTarget, BrowserExecutionTarget } from './tools/display-carrier.js';
import type { BrowserCaptureOptions, CaptureBackend, CaptureBackendObserved, CommandResult } from './types.js';
export interface CapturePixelWitness {
    readonly width: number;
    readonly height: number;
    readonly sampledPixels: number;
    readonly lumaMin: number;
    readonly lumaMax: number;
    readonly lumaRange: number;
    readonly varyingPixels: number;
    readonly rendered: boolean;
}
export interface BrowserCaptureRuntimeWitness {
    readonly title: string;
    readonly canvas: {
        readonly width: number;
        readonly height: number;
    } | null;
    readonly domUi: {
        readonly rootChildren: number;
        readonly openShadowRoots: number;
        readonly textWitness: string;
    };
    readonly adapter: Readonly<Record<string, unknown>> | null;
    readonly adapterError: string | null;
    readonly engineFrameId: number | null;
    readonly captureReady: string | null;
    readonly fatalError: string | null;
    readonly singleHtml: {
        readonly ready: boolean;
        readonly resourceHits: number;
        readonly resourceMisses: readonly Readonly<Record<string, unknown>>[];
        readonly externalRequests: readonly Readonly<Record<string, unknown>>[];
    } | null;
    readonly userAgent: string;
}
export interface BrowserCaptureRequestWitness {
    readonly url: string;
    readonly resourceType: string;
    readonly status: number | null;
    readonly failed: boolean;
    readonly failure: string | null;
    readonly resourceMiss: boolean;
}
export interface BrowserCaptureRequestReport {
    readonly documents: number;
    readonly http: number;
    readonly https: number;
    readonly failed: number;
    readonly resourceMisses: number;
    readonly entries: readonly BrowserCaptureRequestWitness[];
}
export interface BrowserCaptureRecord {
    readonly index: number;
    readonly checkpoint: string | null;
    readonly ok: boolean;
    readonly output: string;
    readonly digest: string;
    readonly pixels: CapturePixelWitness;
    readonly runtime: BrowserCaptureRuntimeWitness;
}
export interface BrowserCaptureRunReport {
    readonly schemaVersion: '2.0.0';
    readonly runId: string;
    readonly ok: boolean;
    readonly mode: 'browser-compositor' | 'advanced-cpu-only-development';
    readonly root: string;
    readonly url: string;
    readonly target: BrowserCaptureTarget;
    readonly carrier: 'private-browser' | 'borrowed';
    readonly carrierTarget?: BrowserCarrierTarget;
    readonly carrierFallbackReason?: string;
    readonly launchProfile: BrowserLaunchProfile;
    readonly report: string;
    readonly backendRequested: CaptureBackend;
    readonly backend: CaptureBackendObserved;
    readonly fallbackReason?: string;
    readonly deterministicRequested: boolean;
    readonly viewport: {
        readonly width: number;
        readonly height: number;
        readonly deviceScaleFactor: number;
        readonly colorProfile: 'srgb';
        readonly colorScheme: 'light';
        readonly locale: 'en-US';
        readonly timezone: 'UTC';
    };
    readonly browser: {
        readonly version: string;
        readonly executable: string;
    };
    readonly display: string | null;
    readonly lavapipeIcd: string | null;
    readonly captures: readonly BrowserCaptureRecord[];
    readonly requests: BrowserCaptureRequestReport;
    readonly singleHtml: BrowserCaptureRuntimeWitness['singleHtml'];
    readonly consoleErrors: readonly string[];
    readonly pageErrors: readonly string[];
    /** Browser input limitations observed during an otherwise usable capture. */
    readonly inputWarnings: readonly string[];
    readonly closedAt?: string;
    readonly boundary: string;
}
export type BrowserCaptureTarget = {
    readonly kind: 'project';
} | {
    readonly kind: 'single-html';
    readonly path: string;
};
export type BrowserLaunchProfile = 'development' | 'release';
export interface BrowserCaptureOpenOptions extends Pick<BrowserCaptureOptions, 'backend' | 'browser' | 'width' | 'height' | 'port' | 'requireUi' | 'deterministic' | 'headless' | 'carrier' | 'carrierRun' | 'carrierGeneration'> {
    readonly outputDir?: string;
    readonly report?: string;
    readonly runId?: string;
    readonly target?: BrowserCaptureTarget;
    /** Use an already-running project server owned by the live project child. */
    readonly serverUrl?: string;
    /** Borrow an existing Host for this capture's main-thread project server. */
    readonly host?: DevKitHostBinding;
    /** Release omits unsafe WebGPU/file-access flags; development preserves the legacy lane. */
    readonly launchProfile?: BrowserLaunchProfile;
}
export interface BrowserCaptureCheckpointOptions {
    /** Live observation records failures; validation remains the default. */
    readonly purpose?: 'observe' | 'validate';
    /** Shared budget for frame, checkpoint, compositor and pixel waits. */
    readonly timeoutMs?: number;
    readonly output?: string;
    readonly waitMs?: number;
    readonly requireUi?: boolean;
    /** Require a frame submitted after this frame id before taking the image. */
    readonly afterFrameId?: number;
}
export interface BrowserCaptureSession {
    readonly page: Page;
    /**
     * The exact Engine execution realm. For a borrowed display host carrier this may be
     * a child Frame while `page` remains the stable owner document.
     */
    readonly execution?: BrowserExecutionTarget;
    readonly url: string;
    readonly reportPath: string;
    capture(checkpoint?: string, options?: BrowserCaptureCheckpointOptions): Promise<BrowserCaptureRecord>;
    report(): BrowserCaptureRunReport;
    close(): Promise<void>;
}
export interface BrowserCapture {
    open(options: BrowserCaptureOpenOptions): Promise<BrowserCaptureSession>;
    close(): Promise<void>;
}
/** @internal Classify a reported adapter as a software or hardware lane. */
export declare function classifyCaptureAdapter(adapter: Readonly<Record<string, unknown>> | null): CaptureBackendObserved;
/** @internal Shared browser discovery for live capture and resource preview. */
export declare function resolveBrowserExecutable(requested: string | undefined): Promise<string | undefined>;
export declare function browserLaunchArgs(backend: CaptureBackend, profile: BrowserLaunchProfile, nativeWindow: boolean): string[];
export declare function summarizeCapturePixels(rgba: Uint8Array, width: number, height: number): CapturePixelWitness;
export declare function captureBrowserExecutionSurface(execution: BrowserExecutionTarget, deadline: number, extent: {
    readonly width: number;
    readonly height: number;
}): Promise<Uint8Array>;
export declare function createBrowserCapture(root: string): BrowserCapture;
export declare function browserCaptureCommand(options: BrowserCaptureOptions): Promise<CommandResult<BrowserCaptureRunReport>>;
//# sourceMappingURL=browser-capture.d.ts.map