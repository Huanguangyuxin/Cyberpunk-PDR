import type { CarrierExecutionRequest, CarrierOffer, CarrierStateMachine, ToolTerminal } from '@forgeax/engine-tool-runtime';
export interface CarrierProviderServiceOptions {
    readonly machine: CarrierStateMachine;
    readonly descriptorDigest: string;
    readonly recipeDigest: string;
    readonly execute: (request: CarrierExecutionRequest) => Promise<ToolTerminal<unknown>> | ToolTerminal<unknown>;
    readonly host?: '127.0.0.1' | 'localhost';
}
export interface CarrierProviderService {
    readonly endpoint: string;
    readonly offer: CarrierOffer;
    readonly close: () => Promise<void>;
}
export declare function createCarrierProviderService(options: CarrierProviderServiceOptions): Promise<CarrierProviderService>;
//# sourceMappingURL=carrier-provider.d.ts.map