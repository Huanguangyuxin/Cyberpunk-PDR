import type { Frame, Page } from 'playwright';
/** Identity owned by the Engine run service and echoed by a borrowed carrier. */
export interface BrowserCarrierRunIdentity {
    readonly serviceId: string;
    readonly runId: string;
}
/** Stable identity returned by a display carrier; never infer it from URL/page order. */
export interface BrowserCarrierTarget {
    readonly leaseId: string;
    readonly targetId: string;
    readonly kind: string;
    /** Stable DOM id of the exact carrier surface allocated for this lease. */
    readonly surfaceId: string;
    readonly run: BrowserCarrierRunIdentity;
    readonly generation: number;
    readonly width: number;
    readonly height: number;
    readonly gpu: 'auto' | 'hardware' | 'software';
}
export interface BrowserCarrierRequest extends Pick<BrowserCarrierTarget, 'run' | 'generation' | 'gpu' | 'width' | 'height'> {
    readonly headless: boolean;
    readonly url: string;
}
export interface BrowserCarrierFallback {
    readonly carrier: 'private-browser';
    readonly fallbackReason: string;
    readonly message?: string;
}
export interface BrowserCarrierLeaseSelection {
    readonly carrier: 'borrowed';
    readonly target: BrowserCarrierTarget;
    /** Release only this borrowed page; never close the carrier host. */
    readonly release: (reason?: string) => Promise<void>;
}
export type BrowserCarrierSelection = BrowserCarrierFallback | BrowserCarrierLeaseSelection;
/**
 * The browser document that owns a carrier lease is not necessarily the
 * Engine execution realm. A display host can keep its outer document stable and give
 * a run one exact child Frame; the Frame is then the only realm that DevKit
 * navigates or observes for that run.
 */
export type BrowserExecutionTarget = {
    readonly kind: 'page';
    readonly ownerPage: Page;
    readonly realm: Page;
} | {
    readonly kind: 'frame';
    readonly ownerPage: Page;
    readonly realm: Frame;
    /** Exact outer iframe selector used to make a hidden target capturable. */
    readonly surfaceSelector: string;
};
/** Exact browser attachment returned by the owning browser implementation. */
export interface BrowserCarrierAttachment {
    /** Stable outer page owned by the embedding browser/display host. */
    readonly page: Page;
    readonly target: BrowserCarrierTarget;
    /** Exact realm that Engine navigates, observes, and captures for this run. */
    readonly execution: BrowserExecutionTarget;
    readonly close: (reason?: string) => Promise<void>;
}
export interface BrowserCarrierAcquireOptions {
    readonly signal?: AbortSignal;
    /** Reason passed to the carrier when attachment fails after allocation. */
    readonly releaseReason?: string;
}
export interface BrowserCarrierAcquireResult {
    readonly attachment?: BrowserCarrierAttachment;
    readonly fallbackReason?: string;
}
/**
 * Engine-owned seam for an already-open display host.
 *
 * An existing browser-page owner provides this contract from its own package;
 * DevKit owns navigation, observations, capture, and run-service lifetime after
 * `attach` succeeds. The seam neither launches a display host nor selects a
 * browser connection transport.
 */
export interface BrowserCarrierAdapter {
    readonly select: (request: BrowserCarrierRequest, options?: {
        readonly signal?: AbortSignal;
    }) => Promise<BrowserCarrierSelection>;
    readonly attach: (selection: BrowserCarrierLeaseSelection, options?: {
        readonly signal?: AbortSignal;
    }) => Promise<BrowserCarrierAttachment>;
}
export declare function assertBrowserCarrierTarget(target: BrowserCarrierTarget): BrowserCarrierTarget;
/**
 * Verify that an attachment still refers to the page selected for this run.
 * Presentation dimensions or the observed GPU mode may differ, but the lease,
 * target, run, and generation are immutable identity fields.
 */
export declare function assertBrowserCarrierTargetMatch(expected: BrowserCarrierTarget, actual: BrowserCarrierTarget): BrowserCarrierTarget;
/** Verify that the selected target is bound to the requesting service run. */
export declare function assertBrowserCarrierTargetForRequest(request: BrowserCarrierRequest, target: BrowserCarrierTarget): BrowserCarrierTarget;
/** Validate the complete owner/realm attachment before Engine starts a run. */
export declare function assertBrowserCarrierAttachment(attachment: BrowserCarrierAttachment): BrowserCarrierAttachment;
/**
 * Bind the capture surface to the exact execution frame. The carrier must
 * provide the iframe selector it allocated; a valid selector pointing at a
 * workspace or another iframe is still rejected when its content frame is
 * not the execution realm.
 */
export declare function assertBrowserCarrierSurface(attachment: BrowserCarrierAttachment): Promise<void>;
/**
 * Select and attach one exact display page, or return the carrier's explicit
 * private-browser fallback. This is the single browser-owner seam shared by
 * persistent DevKit runs and one-shot browser tools.
 */
export declare function acquireBrowserCarrierPage(carrier: BrowserCarrierAdapter, request: BrowserCarrierRequest, options?: BrowserCarrierAcquireOptions): Promise<BrowserCarrierAcquireResult>;
//# sourceMappingURL=display-carrier.d.ts.map