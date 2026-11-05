import { type AuthenticatedLoopbackTransport, type ServiceWireHandler } from '@forgeax/engine-tool-runtime';
export type { AuthenticatedLoopbackTransport, AuthenticatedLoopbackTransportOptions, ServiceWireHandler, ServiceWireRequest, } from '@forgeax/engine-tool-runtime';
export { createAuthenticatedLoopbackTransport } from '@forgeax/engine-tool-runtime';
export interface AuthenticatedLoopbackServiceOptions {
    readonly bearerToken: string;
    readonly handler: ServiceWireHandler;
    readonly host?: '127.0.0.1' | 'localhost';
    readonly expectedDescriptorDigest?: string;
    readonly expectedRecipeDigest?: string;
}
export interface AuthenticatedLoopbackService {
    readonly endpoint: string;
    readonly transport: AuthenticatedLoopbackTransport;
    readonly close: () => Promise<void>;
}
export declare function createAuthenticatedLoopbackService(options: AuthenticatedLoopbackServiceOptions): Promise<AuthenticatedLoopbackService>;
//# sourceMappingURL=service-transport.d.ts.map