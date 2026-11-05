import { type ToolPreviewRecipeOptions, type ToolPreviewRunResult } from '@forgeax/engine-app';
import type { CarrierLeaseRequest, CarrierOffer, CarrierResult, CarrierState, ToolDomainFailure, ToolExecutionContext } from '@forgeax/engine-tool-runtime';
import type { CaptureBackend, CaptureBackendObserved } from '../types.js';
import type { BrowserCarrierTarget } from './display-carrier.js';
export interface PreviewHostRequest {
    readonly recipe: ToolPreviewRecipeOptions;
    readonly projectRoot?: string;
    readonly carrier?: PreviewCarrierRoute;
}
export interface PreviewCarrierRoute {
    readonly lookup: () => CarrierOffer | undefined;
    readonly lease: (request: CarrierLeaseRequest) => CarrierResult<{
        readonly leaseId: string;
    }>;
    readonly started: (leaseId: string) => CarrierResult<CarrierState>;
    readonly execute: (leaseId: string, request: Omit<PreviewHostRequest, 'carrier'>, context: Pick<ToolExecutionContext, 'runId' | 'signal'>) => Promise<PreviewRouteResult<PreviewHostResult>>;
    readonly exit: (leaseId: string) => CarrierResult<CarrierState>;
    readonly now?: () => number;
}
/** The browser run result plus the host-observed carrier and backend lane. */
export interface PreviewHostResult extends ToolPreviewRunResult {
    readonly actualCarrier: 'headless-private' | 'headed-private' | 'visible-consumer';
    /** Requested and observed browser adapter lane for host-owned captures. */
    readonly backendRequested?: CaptureBackend;
    readonly backendObserved?: CaptureBackendObserved;
    readonly backendFallbackReason?: string;
    /** Exact target identity when the headed page was borrowed from a display host. */
    readonly carrierTarget?: BrowserCarrierTarget;
    /** Explicit reason when the display host declined and private headed fallback ran. */
    readonly carrierFallbackReason?: string;
    /** A completed capture can still carry a truthful capability limitation. */
    readonly capabilityFailure?: ToolDomainFailure;
}
export type PreviewHostRunner = (request: PreviewHostRequest, context: ToolExecutionContext) => Promise<{
    readonly ok: true;
    readonly value: PreviewHostResult;
} | {
    readonly ok: false;
    readonly error: ToolDomainFailure;
}>;
type PreviewRouteResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: ToolDomainFailure;
};
export declare function runCarrierPreviewRoute<T>(presentation: ToolPreviewRecipeOptions['presentation'], carrier: PreviewCarrierRoute | undefined, executePrivate: () => Promise<PreviewRouteResult<T>>, executeConsumer?: (leaseId: string) => Promise<PreviewRouteResult<T>>): Promise<PreviewRouteResult<T>>;
export declare const runPreviewHost: PreviewHostRunner;
export {};
//# sourceMappingURL=preview-host.d.ts.map