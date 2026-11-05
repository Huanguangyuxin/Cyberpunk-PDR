#!/usr/bin/env node
import { loadToolCatalog, createProjectToolCatalogAuthority, materializeToolDescriptorCatalog, describeTool, listTools } from './chunk-6PBPEM2R.mjs';
import { createOperationHistoryStore } from './chunk-ZYPIUSIT.mjs';
import './chunk-WTUHF6YQ.mjs';
import './chunk-6AKTNSSW.mjs';
import { discoverPluginAssets } from './chunk-5KRT3YGN.mjs';
import './chunk-X5IGMUF7.mjs';
import { readProjectFacts } from './chunk-VNP4GISC.mjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHostStartup } from '@forgeax/engine-host';
import { createToolApiPlugin, Context, registerTools } from '@forgeax/engine-plugin';
import { parseToolJsonSchema, defineCommand, toolJsonSchema, operationCommandPath, createToolCommandRegistry, TOOL_REALMS, domainFailureError } from '@forgeax/engine-tool-runtime';
import { isDeepStrictEqual } from 'util';
import { describeResourcePreviewFailure } from '@forgeax/engine-preview';

function decorateResourcePreviewTerminal(terminal) {
  if (terminal.outcome === "succeeded") return terminal;
  const recovery = describeResourcePreviewFailure(terminal.failure);
  if (recovery === void 0) return terminal;
  if (terminal.failure.code !== "tool-domain-failed") return terminal;
  return {
    ...terminal,
    failure: {
      ...terminal.failure,
      detail: {
        ...terminal.failure.detail,
        ...recovery.suggestedOperation === void 0 ? {} : { suggestedOperation: recovery.suggestedOperation },
        recovery: recovery.actions
      }
    }
  };
}
var retiredPreviewOperationFailure = {
  code: "preview-operation-migrated",
  expected: "a domain-specific preview contribution selected from the project catalog",
  hint: "Use material.preview, mesh.preview, vfx.preview, or texture.preview with a Project GUID.",
  detail: {
    operation: "preview.run",
    replacements: [
      "asset.material.preview",
      "asset.mesh.preview",
      "asset.vfx.preview",
      "asset.texture.preview"
    ]
  }
};
function retiredPreviewTool() {
  return {
    outcome: "failed",
    failure: domainFailureError(
      retiredPreviewOperationFailure.code,
      retiredPreviewOperationFailure.expected,
      retiredPreviewOperationFailure.hint,
      retiredPreviewOperationFailure.detail
    ),
    artifacts: []
  };
}

// src/tools/client.ts
function missingTool(id) {
  return {
    outcome: "failed",
    failure: {
      code: "tool-capability-unavailable",
      expected: `tool ${id} to exist in the project-derived catalog`,
      hint: "Run forgeax help --tree and choose one of the discovered command paths.",
      detail: { capability: `tool:${id}`, realm: "build" }
    },
    artifacts: []
  };
}
function uniqueContributions(contributions) {
  const seen = /* @__PURE__ */ new Map();
  return contributions.filter((contribution) => {
    const id = contribution.descriptor.id;
    const previous = seen.get(id);
    if (previous) {
      if (!isDeepStrictEqual(
        { ...previous, argsSchema: void 0, resultSchema: void 0 },
        { ...contribution.descriptor, argsSchema: void 0, resultSchema: void 0 }
      ) || previous.argsSchema.describe !== contribution.descriptor.argsSchema.describe || previous.resultSchema.describe !== contribution.descriptor.resultSchema.describe) {
        throw new TypeError(`conflicting tool contracts for ${id}`);
      }
      return false;
    }
    seen.set(id, contribution.descriptor);
    return true;
  });
}
async function createToolClient(options) {
  const projectDiscovery = options.projectDiscovery;
  let initialSources = options.inventory;
  const nativePreviewIds = new Set(
    (await import('./preview-catalog-G5SILA5G.mjs')).nativePreviewTools.map(
      ({ descriptor }) => descriptor.id
    )
  );
  const builtins = options.baseContributions ?? [
    ...(await import('./contributions-JSTDCHXL.mjs')).createDefaultContributions(options.projectRoot, () => {
      const taken = initialSources;
      initialSources = void 0;
      return taken;
    }),
    ...(await import('./unified-contributions-RT3NYQKT.mjs')).createUnifiedCommandContributions(
      options.projectRoot
    )
  ];
  let project = [];
  let projectDiscoveryFailure;
  if (projectDiscovery === void 0) {
    try {
      if (initialSources === void 0) {
        const facts = await readProjectFacts(options.projectRoot);
        if (!facts.ok) throw facts.error;
        initialSources = await discoverPluginAssets(facts.value);
      }
      project = await (await import('./project-tools-XIRTTJ6F.mjs')).discoverProjectTools(
        options.projectRoot,
        { ...options, inventory: initialSources }
      );
    } catch (error) {
      projectDiscoveryFailure = error;
      project = [];
    }
    const { devKitBackendHostPack } = await import('./backend-process-26TZPV6C.mjs');
    const hostPack = devKitBackendHostPack(options.projectRoot);
    if (hostPack !== void 0) {
      try {
        const { discoverHostPackTools } = await import('./project-tools-XIRTTJ6F.mjs');
        project = [...project, ...await discoverHostPackTools(hostPack)];
      } catch (error) {
        projectDiscoveryFailure ??= error;
      }
    }
  } else {
    try {
      project = await projectDiscovery(options.projectRoot);
    } catch (error) {
      projectDiscoveryFailure = error;
      project = [];
    }
  }
  let commandRegistry;
  const helpArgsSchema = {
    type: "object",
    properties: {
      path: { type: "array", items: { type: "string" } },
      tree: { type: "boolean" }
    },
    additionalProperties: false
  };
  const helpContribution = defineCommand(
    {
      id: "help",
      path: ["help"],
      title: "Show help",
      summary: "Progressively discover commands and print the command tree.",
      realm: "build",
      argsSchema: toolJsonSchema(helpArgsSchema),
      resultSchema: toolJsonSchema({ type: "object" }),
      evidence: [],
      capabilities: [],
      errors: ["tool-invalid-args", "tool-command-not-found"],
      inputSchema: helpArgsSchema
    },
    (args) => commandRegistry.help(args.path ?? [], args.tree === true)
  );
  const declared = new Set(
    [...builtins, ...project.map((binding) => binding.contribution)].map(
      ({ descriptor }) => descriptor.id
    )
  );
  let liveContributions = [];
  if (projectDiscovery === void 0) {
    try {
      const { discoverDevKitBackendTools } = await import('./backend-process-26TZPV6C.mjs');
      liveContributions = (await discoverDevKitBackendTools(options.projectRoot)).filter(
        ({ descriptor }) => !declared.has(descriptor.id)
      );
    } catch (error) {
      projectDiscoveryFailure ??= error;
    }
  }
  const projectContributions = [
    ...project.map((binding) => binding.contribution),
    ...liveContributions
  ];
  const contributions = [...builtins, ...projectContributions].map((contribution) => {
    const descriptor = {
      ...contribution.descriptor,
      path: contribution.descriptor.path ?? operationCommandPath(contribution.descriptor.id)
    };
    if (nativePreviewIds.has(descriptor.id)) {
      return {
        ...contribution,
        descriptor,
        // Native previews perform their per-run plugin/host activation in
        // the domain owner. The Tool API still owns admission and the
        // outer executor lifetime; this adapter preserves that owner path.
        execute: async (args, context) => {
          const nativePreview = await import('./native-preview-TX5YCPBX.mjs');
          return nativePreview.runNativePreviewTool(
            contribution,
            args,
            {
              signal: context.signal,
              ...context.snapshot === void 0 ? {} : { snapshot: context.snapshot },
              ...context.caller === void 0 ? {} : { caller: context.caller }
            },
            options.projectRoot
          );
        }
      };
    }
    return {
      ...contribution,
      descriptor
    };
  });
  const allContributions = [helpContribution, ...contributions];
  const realmOwnerContributions = options.realmOwners?.flatMap((owner) => owner.contributions) ?? [];
  const catalogContributions = uniqueContributions([
    ...allContributions,
    ...realmOwnerContributions
  ]);
  commandRegistry = createToolCommandRegistry(catalogContributions);
  let ownerContext = options.context;
  let ownsContext = false;
  if (ownerContext === void 0) {
    ownerContext = new Context();
    ownsContext = true;
    if (options.toolApi === void 0) {
      await ownerContext.plugin(createToolApiPlugin());
    } else {
      const suppliedApi = options.toolApi;
      await ownerContext.plugin({
        name: "forgeax:devkit-supplied-tool-api",
        apply(ctx) {
          ctx.provide("toolApi", suppliedApi);
        }
      });
    }
  }
  const api = options.toolApi ?? ownerContext.get("toolApi", false);
  if (api === void 0) {
    throw new TypeError("DevKit ToolClient requires the ToolApi service from its Cordis owner");
  }
  if (options.toolApi !== void 0 && options.context !== void 0) {
    const contextApi = ownerContext.get("toolApi", false);
    if (contextApi !== void 0 && contextApi !== options.toolApi) {
      throw new TypeError("DevKit ToolClient context and toolApi must identify the same owner");
    }
  }
  let buildSession;
  const sourceId = `devkit-local:${crypto.randomUUID()}`;
  const providersByOperation = /* @__PURE__ */ new Map();
  const ownerFibers = [];
  const ownerInputs = options.realmOwners === void 0 ? TOOL_REALMS.map((realm) => ({
    realm,
    tools: allContributions.filter(
      (contribution) => contribution.descriptor.realm === realm && !projectContributions.includes(contribution) && !project.some(
        (binding) => binding.contribution.descriptor.id === contribution.descriptor.id
      )
    ),
    sourceId
  })) : options.realmOwners.map((owner, index) => ({
    realm: owner.realm,
    tools: owner.contributions,
    sourceId: owner.sourceId ?? `${sourceId}:${index}`,
    ...owner.providerId === void 0 ? {} : { providerId: owner.providerId },
    ...owner.module === void 0 ? {} : { module: owner.module }
  }));
  for (const [index, owner] of ownerInputs.entries()) {
    if (owner.tools.length === 0) continue;
    const providerId = owner.providerId ?? `devkit-tool-client:${owner.realm}:${index}:${crypto.randomUUID()}`;
    const bound = {
      name: `forgeax:devkit-tool-provider/${owner.realm}/${index}`,
      inject: ["toolApi"],
      apply(ctx) {
        ctx.effect(
          () => registerTools(ctx, owner.tools, {
            sourceId: owner.sourceId,
            providerId,
            module: owner.module ?? "@forgeax/engine-devkit",
            realm: owner.realm
          })
        );
      }
    };
    const fiber = await ownerContext.plugin(bound);
    ownerFibers.push(fiber);
    for (const tool of owner.tools) {
      const routes = providersByOperation.get(tool.descriptor.id) ?? [];
      routes.push({ providerId, sourceId: owner.sourceId });
      providersByOperation.set(tool.descriptor.id, routes);
    }
  }
  const descriptors = catalogContributions.map(({ descriptor }) => descriptor);
  const loadedResult = await loadToolCatalog(
    createProjectToolCatalogAuthority(options.projectRoot, descriptors),
    descriptors
  );
  const loaded = loadedResult.ok ? loadedResult.value : materializeToolDescriptorCatalog(descriptors, { authorityDigest: "sha256:unbound-project" });
  const executeTool = async (id, args, runOptions = {}) => {
    if (id === "preview.run") return retiredPreviewTool();
    const record = api.list().find(({ descriptor }) => descriptor.id === id);
    if (record === void 0) {
      if (project.some((binding) => binding.realm === "host" && binding.declaration.id === id)) {
        try {
          const { runDevKitBackendTool } = await import('./backend-process-26TZPV6C.mjs');
          return await runDevKitBackendTool(
            options.projectRoot,
            id,
            args,
            runOptions.signal
          );
        } catch (error) {
          return {
            outcome: "failed",
            artifacts: [],
            failure: runOptions.signal?.aborted ? {
              code: "tool-run-cancelled",
              expected: `host tool ${id} to finish before cancellation`,
              hint: "Start a fresh request if the operation is still needed.",
              detail: { reason: "caller aborted" }
            } : {
              code: "tool-capability-unavailable",
              expected: `an active backend provider for ${id}`,
              hint: error instanceof Error ? error.message : String(error),
              detail: { capability: `tool:${id}`, realm: "host" }
            }
          };
        }
      }
      if (project.some((binding) => binding.realm === "build" && binding.declaration.id === id)) {
        buildSession ??= (async () => {
          const facts = await readProjectFacts(options.projectRoot);
          if (!facts.ok) throw facts.error;
          const { loadProjectCookers } = await import('./cookers-NJTDLO3J.mjs');
          return loadProjectCookers(facts.value, []);
        })();
        const session = await buildSession;
        if (session.runTool)
          return await session.runTool(id, args, runOptions);
      }
      return missingTool(id);
    }
    const routes = providersByOperation.get(id) ?? [];
    const requestedRoute = runOptions.providerId === void 0 || runOptions.sourceId === void 0 ? void 0 : routes.find(
      (route) => route.providerId === runOptions.providerId && route.sourceId === runOptions.sourceId
    );
    const provider = requestedRoute ?? (runOptions.providerId === void 0 && runOptions.sourceId === void 0 && routes.length === 1 ? routes[0] : void 0);
    let terminal = await api.run(id, args, {
      ...runOptions,
      ...provider === void 0 ? {} : { providerId: provider.providerId, sourceId: provider.sourceId }
    }).terminal;
    terminal = decorateResourcePreviewTerminal(terminal);
    if (id === "asset.plugin.inspect" && projectDiscoveryFailure !== void 0) {
      const reason = projectDiscoveryFailure instanceof Error ? projectDiscoveryFailure.message : String(projectDiscoveryFailure);
      if (terminal.outcome === "succeeded") {
        const current = terminal.result;
        terminal = {
          ...terminal,
          result: {
            ...current !== null && typeof current === "object" && !Array.isArray(current) ? current : { value: current },
            extensionDiscovery: {
              ok: false,
              error: {
                code: "project-command-discovery-failed",
                expected: "project command contract modules to load without side effects",
                hint: "Repair the commandContract module; built-in commands remain available.",
                detail: { reason }
              }
            }
          }
        };
      }
    }
    return terminal;
  };
  const runTool = async (id, args, runOptions = {}) => {
    const selectedRoot = args && typeof args === "object" && "root" in args && typeof args.root === "string" ? args.root : options.projectRoot;
    return (await createOperationHistoryStore(selectedRoot)).track(
      id,
      args,
      () => executeTool(id, args, runOptions)
    );
  };
  return {
    list: () => listTools(loaded),
    describe: (id) => describeTool(loaded, id),
    help: commandRegistry.help,
    tree: commandRegistry.tree,
    async runPath(path, args, runOptions = {}) {
      const contribution = commandRegistry.get(path);
      if (contribution === void 0) {
        return missingTool(
          typeof path === "string" ? path : path.join(" ")
        );
      }
      return runTool(contribution.descriptor.id, args, runOptions);
    },
    run: runTool,
    async dispose() {
      initialSources = void 0;
      const failures = [];
      try {
        await (await buildSession)?.dispose();
      } catch (cause) {
        failures.push(cause);
      }
      for (const fiber of [...ownerFibers].reverse()) {
        try {
          await fiber.dispose();
        } catch (cause) {
          failures.push(cause);
        }
      }
      ownerFibers.length = 0;
      if (ownsContext) {
        try {
          await ownerContext.fiber.dispose();
        } catch (cause) {
          failures.push(cause);
        }
      }
      if (failures.length) throw new AggregateError(failures, "Tool client cleanup failed");
    }
  };
}

// src/cli-host.ts
function createDevkitCliStartup(projectRoot) {
  let closed = false;
  const lifecycle = new AbortController();
  const active = /* @__PURE__ */ new Set();
  let client;
  let toolApi;
  let ownerContext;
  const closedTerminal = () => ({
    outcome: "failed",
    failure: {
      code: "tool-capability-unavailable",
      expected: "the DevKit CLI Host to remain mounted for the duration of a command",
      hint: "Start a new Host before issuing another command.",
      detail: { capability: "host:devkit-cli", realm: "build" }
    },
    artifacts: []
  });
  const signalFor = (caller) => {
    if (caller === void 0) return lifecycle.signal;
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (caller.aborted || lifecycle.signal.aborted) controller.abort();
    else {
      caller.addEventListener("abort", abort, { once: true });
      lifecycle.signal.addEventListener("abort", abort, { once: true });
    }
    return controller.signal;
  };
  const track = (operation) => {
    active.add(operation);
    void operation.then(
      () => active.delete(operation),
      () => active.delete(operation)
    );
    return operation;
  };
  const wrapClient = (base) => ({
    list: base.list,
    describe: base.describe,
    help: base.help,
    tree: base.tree,
    runPath: (path, args, options) => {
      if (closed) return Promise.resolve(closedTerminal());
      return track(
        base.runPath(path, args, {
          ...options,
          signal: signalFor(options?.signal)
        })
      );
    },
    run: (id, args, options) => {
      if (closed) return Promise.resolve(closedTerminal());
      return track(
        base.run(id, args, {
          ...options,
          signal: signalFor(options?.signal)
        })
      );
    },
    dispose: async () => {
      await base.dispose?.();
    }
  });
  const dispose = async () => {
    if (closed) return;
    closed = true;
    lifecycle.abort();
    await Promise.allSettled([...active]);
    await client?.then((value) => value.dispose?.()).catch(() => {
    });
  };
  const service = {
    ready: () => {
      if (closed) return Promise.reject(new Error("devkit CLI Host has been disposed"));
      client ??= createToolClient({
        projectRoot,
        ...ownerContext === void 0 ? {} : { context: ownerContext },
        ...toolApi === void 0 ? {} : { toolApi }
      }).then(wrapClient);
      return client.then((value) => {
        if (closed) throw new Error("devkit CLI Host has been disposed");
        return value;
      });
    },
    closed: () => closed
  };
  const plugin = {
    name: "forgeax:devkit-cli-host",
    provide: ["devkitCli"],
    apply(ctx) {
      ownerContext = ctx;
      toolApi = ctx.get("toolApi", false);
      ctx.provide("devkitCli", service);
      ctx.effect(() => dispose, "devkit/cli-host");
    }
  };
  return { plugin, service };
}

// src/unified-cli.ts
function flagKey(value) {
  return value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
function parseInput(raw, root) {
  let source = raw === "-" ? readFileSync(0, "utf8") : raw;
  try {
    if (raw !== "-") return JSON.parse(source);
  } catch {
    source = readFileSync(resolve(root, raw), "utf8");
  }
  if (source.trim().length === 0) throw new Error("JSON input is empty");
  return JSON.parse(source);
}
function parseArgs(argv) {
  const path = [];
  const args = {};
  let root = process.cwd();
  let json = false;
  let tree = false;
  let input;
  let inputRaw;
  let inputSeen = false;
  let flagsSeen = false;
  const helpRequested = argv[0] === "help";
  const tokens = helpRequested ? argv.slice(1) : argv;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const equals = token.startsWith("--") ? token.indexOf("=") : -1;
    const value = equals < 0 ? token : token.slice(0, equals);
    const inline = equals < 0 ? void 0 : token.slice(equals + 1);
    if (value === "-h") {
      args.help = true;
      continue;
    }
    if (!value.startsWith("--")) {
      path.push(value);
      continue;
    }
    if (value === "--json" || value === "--tree" || value === "--help") {
      if (inline !== void 0 && inline !== "true" && inline !== "false") {
        throw new Error(`${value} expects true or false`);
      }
      const enabled = inline !== "false";
      if (value === "--json") json = enabled;
      else if (value === "--tree") tree = enabled;
      else args.help = enabled;
      continue;
    }
    if (helpRequested && value !== "--root" && value !== "--input") {
      throw new Error(`unknown help flag ${value}`);
    }
    const key = flagKey(value);
    const next = inline ?? tokens[index + 1];
    if (next === void 0 || inline === void 0 && next.startsWith("--")) {
      if (value === "--root" || value === "--input") throw new Error(`${value} requires a value`);
      args[key] = true;
      flagsSeen = true;
      continue;
    }
    if (inline === void 0) index += 1;
    if (value === "--root") root = next;
    else if (value === "--input") {
      inputRaw = next;
      inputSeen = true;
    } else {
      args[key] = next;
      flagsSeen = true;
    }
  }
  if (inputSeen && flagsSeen) {
    throw new Error("--input cannot be combined with named command flags");
  }
  if (inputRaw !== void 0) input = parseInput(inputRaw, root);
  return {
    path,
    positionals: [],
    root,
    json,
    tree,
    helpRequested,
    ...inputSeen ? { input } : {},
    args
  };
}
function errorResult(error, command) {
  if (error !== null && typeof error === "object") {
    const candidate = error;
    if (candidate.code === "operation-history-write-failed") {
      return {
        ok: false,
        ...command === void 0 ? {} : { command },
        error: {
          code: candidate.code,
          expected: String(candidate.expected),
          hint: String(candidate.hint),
          detail: candidate.detail
        }
      };
    }
    if (typeof candidate.code === "string" && candidate.code.startsWith("tool-command-")) {
      return {
        ok: false,
        ...command === void 0 ? {} : { command },
        error: {
          code: candidate.code,
          expected: "the requested command path to be present in the assembled command tree",
          hint: typeof candidate.message === "string" ? candidate.message : "Inspect help for the valid parent paths.",
          ...candidate.detail === void 0 ? {} : { detail: candidate.detail }
        }
      };
    }
  }
  return {
    ok: false,
    ...command === void 0 ? {} : { command },
    error: {
      code: "cli-parse-error",
      expected: "a valid command path and input object",
      hint: error instanceof Error ? error.message : String(error),
      detail: { message: error instanceof Error ? error.message : String(error) }
    }
  };
}
function coerceNamedArgs(args, schema) {
  if (schema === void 0 || schema.type !== "object") return args;
  const properties = schema.properties ?? {};
  const output = {};
  for (const [key, value] of Object.entries(args)) {
    const property = properties[key];
    if (property === void 0)
      throw new Error(
        `unknown command flag --${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`
      );
    if (typeof value !== "string") {
      output[key] = value;
      continue;
    }
    if (value === "null" && (property.type === "null" || Array.isArray(property.type) && property.type.includes("null"))) {
      output[key] = null;
      continue;
    }
    if (property.type === "boolean") {
      if (value !== "true" && value !== "false") throw new Error(`--${key} expects true or false`);
      output[key] = value === "true";
    } else if (property.type === "number") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`--${key} expects a number`);
      output[key] = parsed;
    } else if (property.type === "integer") {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) throw new Error(`--${key} expects an integer`);
      output[key] = parsed;
    } else if (property.type === "array" || property.type === "object") {
      try {
        const parsed = JSON.parse(value);
        if (property.type === "array" && !Array.isArray(parsed))
          throw new Error(`--${key} expects a JSON array`);
        if (property.type === "object" && (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)))
          throw new Error(`--${key} expects a JSON object`);
        output[key] = parsed;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("--")) throw error;
        throw new Error(`--${key} expects JSON`);
      }
    } else {
      output[key] = value;
    }
  }
  return output;
}
function strictInputSchema(schema) {
  if (schema === void 0) return void 0;
  if (schema.type !== "object" || schema.properties === void 0 || schema.additionalProperties !== void 0) {
    return schema;
  }
  return { ...schema, additionalProperties: false };
}
async function runUnifiedCli(argv) {
  let startup;
  let cli;
  let rawCommand = "";
  try {
    let parsedResult;
    try {
      parsedResult = { ok: true, value: parseArgs(argv) };
    } catch (error) {
      parsedResult = { ok: false, error };
    }
    cli = createDevkitCliStartup(parsedResult.ok ? parsedResult.value.root : process.cwd());
    startup = await createHostStartup({ startupPlugins: [createToolApiPlugin(), cli.plugin] });
    if (!parsedResult.ok) throw parsedResult.error;
    const parsed = parsedResult.value;
    rawCommand = parsed.path.join(" ");
    const client = await cli.service.ready();
    let commandPath = parsed.path;
    let positionals = parsed.positionals;
    if (parsed.helpRequested) {
      return {
        ok: true,
        command: rawCommand || "help",
        value: client.help(parsed.path, parsed.tree)
      };
    }
    if (parsed.path.length > 0) {
      for (let length = parsed.path.length; length > 0; length -= 1) {
        const candidate = parsed.path.slice(0, length);
        try {
          const candidateHelp = client.help(candidate);
          const remaining = [...parsed.path.slice(length), ...parsed.positionals];
          if (remaining.length > 0 && candidateHelp.leaf === void 0) {
            throw new Error(
              `unknown command path after ${candidate.join(" ")}: ${remaining.join(" ")}`
            );
          }
          commandPath = candidate;
          positionals = remaining;
          break;
        } catch {
        }
      }
    }
    const command = commandPath.join(" ");
    if (commandPath.length === 0 || parsed.args.help === true) {
      return { ok: true, command: command || "help", value: client.help(commandPath, parsed.tree) };
    }
    const help = client.help(commandPath, false);
    if (help.leaf === void 0) {
      return { ok: true, command, value: client.help(commandPath, parsed.tree) };
    }
    const effectiveSchema = strictInputSchema(help.leaf?.inputSchema);
    const positional = positionalArgs(command, parsed.args, positionals);
    const namedArgs = effectiveSchema?.properties?.root === void 0 ? positional : { ...positional, root: positional.root ?? resolve(parsed.root) };
    const rawArgs = parsed.input ?? namedArgs;
    const args = parsed.input === void 0 ? coerceNamedArgs(namedArgs, effectiveSchema) : rawArgs;
    if (effectiveSchema?.properties?.json !== void 0 && args !== null && typeof args === "object" && !Array.isArray(args)) {
      Object.assign(args, { json: parsed.json });
    }
    const schema = effectiveSchema;
    if (schema !== void 0) {
      const checked = parseToolJsonSchema(args, schema);
      if (!checked.ok) throw new Error(checked.error);
    }
    const terminal = await client.runPath(command, args);
    return terminalResult(command, terminal);
  } catch (error) {
    return errorResult(error, rawCommand);
  } finally {
    await startup?.dispose();
  }
}
function positionalArgs(command, flags, positionals) {
  const args = { ...flags };
  const positionalName = command === "asset import" ? "path" : command === "asset inspect" || command === "asset resolve" ? "subject" : command === "project new" || command === "sdk install" ? "root" : command === "project engine use-local" ? "path" : void 0;
  if (positionalName === void 0) {
    if (positionals.length > 0) {
      throw new Error(`unexpected positional argument for ${command}: ${positionals[0]}`);
    }
    return args;
  }
  if (positionals.length > 1) {
    throw new Error(
      `too many positional arguments for ${command}: ${positionals.slice(1).join(" ")}`
    );
  }
  const first = positionals[0];
  if (first !== void 0) args[positionalName] = first;
  return args;
}
function terminalResult(command, terminal) {
  if (terminal.outcome === "succeeded") {
    return { ok: true, command, value: terminal.result, artifacts: terminal.artifacts };
  }
  return {
    ok: false,
    command,
    artifacts: terminal.artifacts,
    error: {
      code: terminal.failure.code === "tool-domain-failed" ? terminal.failure.detail.code : terminal.failure.code,
      expected: terminal.failure.expected,
      hint: terminal.failure.hint,
      detail: terminal.failure.code === "tool-domain-failed" ? terminal.failure.detail.payload : terminal.failure.detail
    }
  };
}

export { runUnifiedCli };
//# sourceMappingURL=unified-cli-2TWUJWCM.mjs.map
//# sourceMappingURL=unified-cli-2TWUJWCM.mjs.map