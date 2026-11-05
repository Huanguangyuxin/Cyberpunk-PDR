/** Whole UI document, before any game program is loaded. */
export declare function hostStartupDocument(title: string): string;
/**
 * A JavaScript expression for static bundling, never eval/Function. Native
 * ports: document, events, surface(), now(), visible(), reload(), reducedMotion.
 * Omit the expression for real browser DOM/window. The result exposes the
 * existing prepare/enter/fail/destroy/bindInput/bindSession lifecycle plus
 * submitted(detail) and visibilityChanged() for native App/Platform facts.
 */
export declare function hostStartupScript(startupScreen?: boolean, hostExpression?: string): string;
//# sourceMappingURL=startup-source.d.ts.map