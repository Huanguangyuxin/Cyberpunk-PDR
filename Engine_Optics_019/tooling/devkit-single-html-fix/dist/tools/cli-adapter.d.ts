import { type ToolRuntime, type ToolTerminal } from '@forgeax/engine-tool-runtime';
export declare function decorateResourcePreviewTerminal<TResult>(terminal: ToolTerminal<TResult>): ToolTerminal<TResult>;
export declare function runNamedTool(runtime: ToolRuntime, id: string, args: unknown): Promise<ToolTerminal<unknown>>;
export declare function runGenericTool(runtime: ToolRuntime, id: string, encodedArgs: string): Promise<ToolTerminal<unknown>>;
//# sourceMappingURL=cli-adapter.d.ts.map