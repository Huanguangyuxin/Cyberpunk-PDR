import type { Page } from 'playwright';
import type { TestContext } from 'vitest';
export declare function runPreparedNativeUnit(context: Pick<TestContext, 'signal' | 'onTestFinished'>, command: readonly string[], timeoutMs: number, env: NodeJS.ProcessEnv): Promise<void>;
export declare function nativeUnitCommand(file: string, name: string): string[];
export declare function softwareGraphicsGuard(): Promise<string>;
export declare function assertSoftwareGraphicsGuard(page: Page): Promise<void>;
//# sourceMappingURL=native-unit-owner.d.ts.map