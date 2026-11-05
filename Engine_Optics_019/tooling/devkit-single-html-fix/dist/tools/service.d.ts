import { type AuthenticatedLoopbackTransport, type ServiceAdmissionExpectation, type ServiceAdmissionRef, type ServiceCapability, type ToolContribution, type ToolTerminal } from '@forgeax/engine-tool-runtime';
export interface ServiceExecutorOptions<TArgs, TResult> extends Omit<ServiceAdmissionExpectation, 'toolId' | 'backend'> {
    readonly contribution: ToolContribution<TArgs, TResult>;
    readonly privateExecutor: (args: TArgs) => Promise<ToolTerminal<TResult>>;
    readonly transport: AuthenticatedLoopbackTransport;
    readonly admission?: ServiceAdmissionRef;
    readonly bearerToken?: string;
}
export interface ServiceExecutor<TArgs, TResult> {
    readonly capability: ServiceCapability;
    readonly run: (args: TArgs, options?: {
        readonly recipeDigest?: string;
        readonly signal?: AbortSignal;
    }) => Promise<ToolTerminal<TResult>>;
}
export declare function createServiceExecutor<TArgs, TResult>(options: ServiceExecutorOptions<TArgs, TResult>): ServiceExecutor<TArgs, TResult>;
//# sourceMappingURL=service.d.ts.map