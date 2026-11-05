import type { ExecutionWorkersOptions } from '@forgeax/engine-app';
export declare const executionWorkersSchema: {
    type: "object";
    additionalProperties: false;
    properties: {
        engine: {
            enum: (string | boolean)[];
        };
        render: {
            enum: (string | boolean)[];
        };
        kernels: {
            enum: (string | boolean)[];
        };
    };
};
export declare function executionWorkers(value: unknown): ExecutionWorkersOptions;
/** Ordinary projects select the strongest available worker composition by default. */
export declare function environmentExecutionWorkers(): ExecutionWorkersOptions;
//# sourceMappingURL=execution-workers.d.ts.map