#!/usr/bin/env node
import { startLiveDev, liveDevStatus, liveDevControl } from './chunk-4CLUR564.mjs';
import { executionWorkers, executionWorkersSchema } from './chunk-UTXAIODQ.mjs';
import { animationPlayback, animationPlaybackSchema } from './chunk-6AKTNSSW.mjs';
import { defineTool, toolJsonSchema } from '@forgeax/engine-tool-runtime';

function createWorkspaceLiveTools(defaultRoot) {
  const descriptor = (operation) => ({
    id: `engine.run.${operation}`,
    path: ["engine", "run", ...operation.split(".")],
    title: `Engine run ${operation}`,
    summary: `${operation} an independent Engine run with fixed project inputs.`,
    realm: "host",
    argsSchema: toolJsonSchema({
      type: "object",
      required: [...defaultRoot ? [] : ["root"], ...operation === "verify" ? ["revision"] : []],
      properties: {
        root: { type: "string", minLength: 1 },
        revision: { type: "string", minLength: 1 },
        timeoutMs: { type: "integer", ...operation === "verify" ? { minimum: 1 } : {} }
      }
    }),
    resultSchema: toolJsonSchema({}),
    inputSchema: {
      type: "object",
      required: [...defaultRoot ? [] : ["root"], ...operation === "verify" ? ["revision"] : []],
      properties: {
        root: { type: "string", minLength: 1 },
        headless: { type: "boolean" },
        backend: { enum: ["hardware", "software", "auto"] },
        workers: executionWorkersSchema,
        animation: animationPlaybackSchema,
        revision: { type: "string" },
        code: { type: "string" },
        output: { type: "string" },
        checkpoint: { type: "string" },
        name: { type: "string" },
        ref: { type: "string" },
        timeoutMs: { type: "integer", ...operation === "verify" ? { minimum: 1 } : {} },
        lease: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        distance: { type: "number" },
        lens: { type: "object" },
        exposure: { type: "object" },
        requireUi: { type: "boolean" },
        entity: { type: "number" },
        position: { type: "array", items: { type: "number" } },
        target: { type: "array", items: { type: "number" } },
        up: { type: "array", items: { type: "number" } }
      }
    },
    outputSchema: {},
    evidence: []
  });
  const root = (args) => String(args.root ?? defaultRoot);
  const json = async (value) => JSON.parse(JSON.stringify(await value));
  return [
    defineTool(descriptor("start"), (args) => {
      const headless = args.headless !== false;
      return json(
        startLiveDev(root(args), {
          headless,
          snapshot: true,
          ...args.backend === "hardware" || args.backend === "software" || args.backend === "auto" ? { backend: args.backend } : {},
          ...args.workers === void 0 ? {} : { workers: executionWorkers(args.workers) },
          ...args.animation === void 0 ? {} : { animation: animationPlayback(args.animation) }
        })
      );
    }),
    defineTool(descriptor("status"), (args) => json(liveDevStatus(root(args), { snapshot: true }))),
    ...[
      "observe",
      "reload",
      "stop",
      "capture",
      "verify",
      "eval",
      "find",
      "focus",
      "camera/get",
      "camera/set",
      "camera/release"
    ].map(
      (operation) => defineTool(
        descriptor(operation.replace("/", ".")),
        (args) => json(liveDevControl(root(args), operation, args, { snapshot: true }))
      )
    )
  ];
}

export { createWorkspaceLiveTools };
//# sourceMappingURL=chunk-HIR5RTHU.mjs.map
//# sourceMappingURL=chunk-HIR5RTHU.mjs.map