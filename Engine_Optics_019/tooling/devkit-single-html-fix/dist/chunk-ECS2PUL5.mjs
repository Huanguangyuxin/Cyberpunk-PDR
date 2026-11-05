#!/usr/bin/env node
import { writeSync } from 'fs';
import { inspect } from 'util';

function logBackendStartup(record, descriptor = 2) {
  try {
    writeSync(descriptor, `${JSON.stringify({ scope: "backend-startup", ...record })}
`);
  } catch {
  }
}
async function traceBackendStartup(stage, operation) {
  if (process.argv[2] !== "--__forgeax-backend") return operation();
  const started = performance.now();
  const log = (event) => {
    logBackendStartup({ stage, event, elapsedMs: performance.now() - started });
  };
  log("begin");
  try {
    return await operation();
  } catch (cause) {
    try {
      logBackendStartup({
        stage,
        event: "failed",
        elapsedMs: performance.now() - started,
        // Node's existing diagnostic formatter preserves typed/nested causes.
        // Do not execute author getters or custom inspection hooks while logging.
        error: inspect(cause, {
          depth: 4,
          maxArrayLength: 32,
          maxStringLength: 2e3,
          customInspect: false,
          getters: false,
          breakLength: Infinity
        }).slice(0, 16384)
      });
    } catch {
    }
    throw cause;
  } finally {
    log("end");
  }
}

export { logBackendStartup, traceBackendStartup };
//# sourceMappingURL=chunk-ECS2PUL5.mjs.map
//# sourceMappingURL=chunk-ECS2PUL5.mjs.map