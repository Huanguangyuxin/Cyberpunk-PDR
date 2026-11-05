import { pathToFileURL } from 'url';
import { ImporterRegistry } from '@forgeax/engine-import';
import { NativeCookerRegistry } from '@forgeax/engine-pack/native-cooker';
import { copyPackData } from '@forgeax/engine-pack/runtime';
import { Context, createToolApiPlugin, startPluginAsset, createContextCapabilityResolver } from '@forgeax/engine-plugin';
import { validateDynamicGeometryMeshBudget, validateRenderProfile } from '@forgeax/engine-render';
import { err, ok } from '@forgeax/engine-types';

// src/build/build-process.ts
var callbacks = /* @__PURE__ */ new Map();
var callbackSequence = 0;
function callParent(request, operation, args) {
  return new Promise((resolve, reject) => {
    const callback = ++callbackSequence;
    callbacks.set(callback, { resolve, reject });
    process.send?.({ callback, request, operation, args });
  });
}
var context = new Context();
var cookers = new NativeCookerRegistry();
var importers = new ImporterRegistry();
var root;
var tail = Promise.resolve();
var started = false;
var runs = /* @__PURE__ */ new Map();
function projectAppOptions(value) {
  if (value === void 0) return {};
  if (typeof value !== "object" || value === null || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null || Reflect.ownKeys(value).some(
    (key) => key !== "dynamicGeometryMeshBudgetBytes" && key !== "standardProfile" && key !== "pipelineLibrary" && key !== "time" && key !== "renderPipelineCapacity"
  ))
    throw new TypeError("devkitAppOptions must contain only public project App options");
  const options = copyPackData(value);
  const capacity = options.renderPipelineCapacity;
  if (capacity !== void 0 && capacity !== 2 && capacity !== 3 && capacity !== 4)
    throw new TypeError("devkitAppOptions.renderPipelineCapacity must be 2, 3 or 4");
  if (options.time !== void 0) {
    const time = options.time;
    if (typeof time !== "object" || time === null || Array.isArray(time) || Object.entries(time).some(
      ([key, value2]) => !["fixedDeltaSeconds", "maxStepsPerUpdate", "maxDeltaSeconds"].includes(key) || typeof value2 !== "number" || !Number.isFinite(value2) || value2 <= 0 || key === "maxStepsPerUpdate" && !Number.isSafeInteger(value2)
    ))
      throw new TypeError("devkitAppOptions.time must contain positive finite World time options");
  }
  if (options.dynamicGeometryMeshBudgetBytes !== void 0)
    validateDynamicGeometryMeshBudget(options.dynamicGeometryMeshBudgetBytes);
  if (options.standardProfile !== void 0) {
    const invalid = validateRenderProfile(options.standardProfile);
    if (invalid !== void 0) throw new TypeError(invalid);
  }
  return options;
}
function projectDelivery(value) {
  if (value === void 0) return {};
  const fail = (reason) => new TypeError(`devkitDelivery ${reason}`);
  if (typeof value !== "object" || value === null || Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null || Reflect.ownKeys(value).some((key) => key !== "bundles"))
    throw fail("must contain only bundles");
  const bundles = copyPackData(value).bundles;
  if (bundles === void 0) return {};
  if (typeof bundles !== "object" || bundles === null || Array.isArray(bundles))
    throw fail("bundles must map Bundle names to source path prefixes");
  const owners = /* @__PURE__ */ new Map();
  for (const [name, prefixes] of Object.entries(bundles)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name))
      throw fail(`Bundle name ${JSON.stringify(name)}`);
    if (!Array.isArray(prefixes) || prefixes.length === 0)
      throw fail(`${name} must list source path prefixes`);
    for (const prefix of prefixes) {
      if (typeof prefix !== "string" || prefix.length === 0 || prefix.startsWith("/") || prefix.includes("\\") || prefix.split("/").some((part) => part === ".." || part === "."))
        throw fail(`${name} prefix ${JSON.stringify(prefix)} must be a project-relative path`);
      const owner = owners.get(prefix);
      if (owner !== void 0) throw fail(`prefix ${prefix} belongs to both ${owner} and ${name}`);
      owners.set(prefix, name);
    }
  }
  return { bundles };
}
async function execute(request) {
  switch (request.operation) {
    case "start": {
      if (started) throw new Error("build process already started");
      started = true;
      const source = new Map(
        request.definitions.map((definition) => [definition.guid, definition])
      );
      const module = await import(pathToFileURL(request.entry).href);
      const programs = module.createPrograms(request.sessionId, "build", 1);
      await context.plugin(createToolApiPlugin());
      const foundation = context.plugin({
        name: "forgeax:build-foundation",
        apply(ctx) {
          ctx.provide("nativeCookers", cookers);
          ctx.provide("importers", importers);
          ctx.provide("assets", {
            async readPluginDefinition(guid) {
              const definition = source.get(guid);
              return definition ? ok(structuredClone(definition)) : err({
                code: "plugin-bootstrap-read-blocked",
                expected: "a source-discoverable plugin definition",
                hint: "move build dependencies to source-only Packs",
                detail: { guid, root: request.root, operation: "readPluginDefinition" }
              });
            },
            async load(guid) {
              return err({
                code: "plugin-bootstrap-read-blocked",
                expected: "source-only build bootstrap",
                hint: "read cooked content during a producer operation after startup",
                detail: { guid, root: request.root, operation: "load" }
              });
            }
          });
          ctx.provide("pluginPrograms", programs);
        }
      });
      await foundation.await();
      const result = await startPluginAsset(context, request.root);
      if (!result.ok) throw result.error;
      root = result.value;
      return {
        appOptions: projectAppOptions(context.get("devkitAppOptions")),
        delivery: projectDelivery(context.get("devkitDelivery")),
        cookers: cookers.registeredCookers(),
        importers: importers.registeredImporters().map((key) => {
          const value = importers.get(key);
          if (!value) throw new Error(`importer disappeared during startup: ${key}`);
          return {
            key,
            decodeImage: !!value.capabilities?.decodeImage,
            publish: !!value.capabilities?.catalog?.publish,
            finalize: !!value.finalize
          };
        })
      };
    }
    case "cook": {
      if (!root || root.state !== 2) throw new Error("build root is not active");
      const result = await cookers.runDraft(request.key, request.input);
      if (!result.ok) throw result.error;
      return result.value;
    }
    case "import": {
      if (!root || root.state !== 2) throw new Error("build root is not active");
      const importer = importers.get(request.key);
      if (!importer) throw new Error(`unregistered importer ${request.key}`);
      const context2 = {
        ...request.context,
        readSource: () => callParent(request.id, "readSource", []),
        readSibling: (...args) => callParent(request.id, "readSibling", args),
        decodeImage: (...args) => callParent(request.id, "decodeImage", args)
      };
      return importer.import(context2);
    }
    case "decodeImage": {
      const decoder = importers.get(request.key)?.capabilities?.decodeImage;
      if (!decoder) throw new Error(`unregistered decoder ${request.key}`);
      return decoder(...request.args);
    }
    case "publish":
      return importers.shouldPublishCatalog({ importer: request.key, ...request.input });
    case "finalize": {
      const finalize = importers.get(request.key)?.finalize;
      if (!finalize) throw new Error(`unregistered finalizer ${request.key}`);
      return finalize(request.product, {
        artifactUrl(artifact) {
          const url = request.urls[artifact.path];
          if (url === void 0)
            throw new Error(`finalizer requested undeclared artifact ${artifact.path}`);
          return url;
        }
      });
    }
    case "tool": {
      const api = context.toolApi;
      if (!api || !root || root.state !== 2)
        throw new Error("build tools require an active build root");
      const run = api.run(request.tool, request.args, {
        ...request.options,
        capabilityResolver: createContextCapabilityResolver(context)
      });
      runs.set(request.id, run);
      try {
        return await run.terminal;
      } finally {
        runs.delete(request.id);
      }
    }
    case "cancelTool":
      runs.get(request.run)?.cancel("caller cancelled");
      return void 0;
    case "dispose": {
      await context.fiber.dispose();
      const remaining = cookers.registeredCookers();
      if (remaining.length)
        throw new Error(`build cleanup left registered cookers: ${remaining.join(", ")}`);
      const remainingImporters = importers.registeredImporters();
      if (remainingImporters.length)
        throw new Error(
          `build cleanup left registered importers: ${remainingImporters.join(", ")}`
        );
      return void 0;
    }
  }
}
function serializableError(error) {
  if (error instanceof Error)
    return { name: error.name, message: error.message, stack: error.stack };
  try {
    return structuredClone(error);
  } catch {
    return { message: String(error) };
  }
}
process.on("message", (request) => {
  if ("callback" in request) {
    const pending = callbacks.get(request.callback);
    callbacks.delete(request.callback);
    if (request.ok) pending?.resolve(request.value);
    else pending?.reject(request.error);
    return;
  }
  const respond = async () => {
    try {
      process.send?.({ id: request.id, ok: true, value: await execute(request) });
    } catch (cause) {
      process.send?.({ id: request.id, ok: false, error: serializableError(cause) });
    }
  };
  if (request.operation === "decodeImage" || request.operation === "tool" || request.operation === "cancelTool")
    void respond();
  else tail = tail.then(respond);
});
process.once("disconnect", () => {
  process.exit(0);
});
//# sourceMappingURL=build-process.mjs.map
//# sourceMappingURL=build-process.mjs.map