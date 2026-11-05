#!/usr/bin/env node
import { projectPluginPrograms, exportModule, runtimeProgramIdentity, resolveNodePackProgramImport, nativeModuleKey, pluginRuntimeProjection, assertPluginProgramGraphInputs, rewriteModuleSpecifiers, nativeModuleIdentity } from './chunk-WBZD4GEB.mjs';
import { projectToolProjection } from './chunk-A2W6KPHB.mjs';
import { pluginAssetClosure, assertPluginSourceInputs, capturePluginProgramInputs, discoverPluginAssets } from './chunk-5KRT3YGN.mjs';
import { fork } from 'child_process';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, writeFile, mkdtemp, rm } from 'fs/promises';
import { resolve, isAbsolute } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { isBuiltin, createRequire } from 'module';
import { preparePackProgram } from '@forgeax/engine-pack/runtime';
import { resolve as resolve$1 } from 'import-meta-resolve';
import { build } from 'vite';

async function compileNodePluginPrograms(facts, target, inventory, temporary, resolution = {}, trace = (_stage, operation) => operation()) {
  const records = pluginAssetClosure(inventory, facts.roots[target]);
  const { tools } = await trace(
    "host-compile-tools",
    () => projectToolProjection(facts.root, inventory)
  );
  const projection = projectPluginPrograms(records, target, tools, facts.root);
  const entries = [...projection.programs];
  const watchFiles = /* @__PURE__ */ new Set();
  let engineIdentity;
  const bindings = /* @__PURE__ */ new Map();
  const identities = /* @__PURE__ */ new Map();
  const project = pathToFileURL(resolve(facts.root, "package.json")).href;
  const recordExternal = async (url, key, supplied) => {
    if (!bindings.has(url)) {
      let identity = identities.get(url);
      if (!identity) {
        identity = supplied ? Promise.resolve(supplied.identity) : nativeModuleIdentity(url);
        identities.set(url, identity);
      }
      bindings.set(url, { key, binding: { identity: await identity, url } });
    }
    return { id: url, external: true };
  };
  const output = entries.length ? await trace(
    "host-compile-vite",
    () => build({
      ...resolution,
      root: facts.root,
      configFile: false,
      logLevel: "silent",
      plugins: [
        {
          name: "forgeax:build-native-identity",
          enforce: "pre",
          async resolveId(id, importer) {
            if (id.startsWith("virtual:") || id.startsWith("\0") || id.startsWith(".") || isAbsolute(id))
              return void 0;
            if (isBuiltin(id) || id === "@deepseek-ai/cordis" || id === "@forgeax/engine" || id.startsWith("@forgeax/engine/") || id.startsWith("@forgeax/engine-")) {
              const key = isBuiltin(id) && !id.startsWith("node:") ? `node:${id}` : id === "@forgeax/engine-plugin" ? "@forgeax/engine/plugin" : id === "@forgeax/engine-tool-runtime" ? "@forgeax/engine/tool-runtime" : id;
              let identity;
              if (!isBuiltin(id) && id !== "@deepseek-ai/cordis") {
                engineIdentity ??= trace(
                  "host-compile-engine-identity",
                  () => runtimeProgramIdentity(
                    createRequire(resolve(facts.root, "package.json")).resolve(
                      "@forgeax/engine/package.json"
                    )
                  )
                );
                identity = await engineIdentity;
              }
              const binding = await resolveNodePackProgramImport(facts.root, key, identity);
              return recordExternal(binding.url, key, binding);
            }
            const resolved = await this.resolve(id, importer, { skipSelf: true });
            if (!resolved?.external) return resolved;
            const parent = importer && isAbsolute(importer) ? pathToFileURL(importer.split("?")[0] ?? importer).href : project;
            const url = resolve$1(resolved.id, parent);
            return recordExternal(url, await nativeModuleKey(facts.root, url, importer));
          }
        },
        ...resolution.plugins ?? [],
        pluginRuntimeProjection(facts.root, inventory.sourceInputs),
        {
          name: "forgeax:build-inputs",
          async buildStart() {
            for (const [, value] of entries)
              await trace(
                "host-compile-inputs",
                () => capturePluginProgramInputs(
                  facts.root,
                  inventory,
                  value.module,
                  async (specifier, importer) => (await this.resolve(specifier, importer))?.id
                )
              );
          },
          async buildEnd() {
            assertPluginProgramGraphInputs(
              facts.root,
              inventory,
              this.getModuleIds(),
              (id) => this.getModuleInfo(id)
            );
            await assertPluginSourceInputs(inventory, facts.root);
            inventory.sourceSnapshot.releaseResolvers();
            for (const id of this.getModuleIds())
              if (id.startsWith("/")) watchFiles.add(id.split("?")[0] ?? id);
          }
        }
      ],
      build: {
        ssr: true,
        write: false,
        target: "node22",
        minify: false,
        rollupOptions: {
          input: Object.fromEntries(
            entries.map(([, value], index) => [
              `program-${index}`,
              exportModule(value.module, value.export)
            ])
          ),
          preserveEntrySignatures: "strict",
          output: {
            format: "es",
            entryFileNames: "[name].mjs",
            chunkFileNames: "[name]-[hash].mjs"
          }
        }
      }
    })
  ) : void 0;
  const chunks = output && !Array.isArray(output) && "output" in output ? output.output : [];
  const modules = {};
  for (const chunk of chunks) {
    if (chunk.type !== "chunk")
      throw new TypeError(
        `plugin program resource requires a portable producer: ${chunk.fileName}`
      );
    modules[chunk.fileName] = rewriteModuleSpecifiers(
      chunk.code,
      chunk.fileName,
      (specifier) => bindings.get(specifier)?.key
    );
  }
  const imports = Object.fromEntries(
    [...bindings.values()].map(({ key, binding }) => [key, binding])
  );
  const graph = {
    modules,
    imports: Object.fromEntries(
      Object.entries(imports).map(([key, binding]) => [key, binding.identity])
    )
  };
  const artifacts = entries.map(([key, value]) => {
    const facade = `\0${exportModule(value.module, value.export)}`;
    const chunk = chunks.find((chunk2) => chunk2.type === "chunk" && chunk2.facadeModuleId === facade);
    if (!chunk) throw new TypeError(`missing compiled plugin export ${key}`);
    const artifact = preparePackProgram({
      ...graph,
      entry: chunk.fileName,
      export: "default"
    }).unwrap();
    return [key, { entry: artifact.entry, export: artifact.export, digest: artifact.digest }];
  });
  await trace("host-compile-fence", () => assertPluginSourceInputs(inventory, facts.root));
  const entry = resolve(temporary, "compiled/entry.mjs");
  await mkdir(resolve(temporary, "compiled"), { recursive: true });
  const bundledHost = new URL("./pack-program-host.mjs", import.meta.url);
  const programHost = existsSync(fileURLToPath(bundledHost)) ? bundledHost : new URL("../../dist/pack-program-host.mjs", import.meta.url);
  await writeFile(
    entry,
    `import { loadPackProgram } from ${JSON.stringify(import.meta.resolve("@forgeax/engine-pack/runtime"))};
import { createNodePackProgramHost } from ${JSON.stringify(programHost.href)};
const graph = ${JSON.stringify(graph)};
const imports = ${JSON.stringify(imports)};
const programHost = createNodePackProgramHost(${JSON.stringify(resolve(temporary, "programs"))});
const programs = new Map(${JSON.stringify(artifacts)}.map(([key, selection]) => {
  const artifact = { ...graph, ...selection };
  return [key, { exportSource: async () => artifact, load: async () => (await loadPackProgram(artifact, imports, programHost)).unwrap() }];
}));
const definitions = new Map(${JSON.stringify(records.map((record) => [record.definition.guid, record.definition.evidence]))});
const tools = new Map(${JSON.stringify([...projection.tools])});
export function createPrograms(sessionId, contextId, sessionGeneration) {
  return Object.freeze({ sessionId, contextId, sessionGeneration, target: ${JSON.stringify(target)}, programs, definitions, tools, imports, programHost });
}
`
  );
  return { entry, watchFiles };
}

// src/build/cookers.ts
async function loadProjectCookers(facts, builtins, resolution = {}, options = {}) {
  for (const timeout of [
    options.startupTimeoutMs,
    options.operationTimeoutMs,
    options.cleanupTimeoutMs
  ])
    if (timeout !== void 0 && (!Number.isFinite(timeout) || timeout <= 0))
      throw new RangeError("build deadlines must be positive finite milliseconds");
  if (!facts.roots.build)
    return {
      appOptions: {},
      delivery: {},
      cookers: builtins,
      importers: [],
      watchFiles: /* @__PURE__ */ new Set(),
      async dispose() {
      }
    };
  const inventory = options.inventory ?? await discoverPluginAssets(facts);
  const records = pluginAssetClosure(inventory, facts.roots.build);
  const directory = resolve(facts.root, ".forgeax", "build");
  await mkdir(directory, { recursive: true });
  const temporary = await mkdtemp(resolve(directory, "session-"));
  const watchFiles = /* @__PURE__ */ new Set();
  let child;
  const contexts = /* @__PURE__ */ new Map();
  const pending = /* @__PURE__ */ new Map();
  let sequence = 0;
  let disposed = false;
  let terminated = false;
  function abort(error) {
    terminated = true;
    for (const request2 of pending.values()) request2.reject(error);
    pending.clear();
    child?.kill("SIGKILL");
  }
  function request(value, timeoutMs = options.operationTimeoutMs ?? 6e4, context, signal) {
    return new Promise((resolve3, reject) => {
      if (!child?.connected || disposed || terminated) {
        reject(new Error("build process is unavailable"));
        return;
      }
      const id = ++sequence;
      if (context) contexts.set(id, context);
      const cancel = () => {
        if (child?.connected) child.send({ id: ++sequence, operation: "cancelTool", run: id });
      };
      signal?.addEventListener("abort", cancel, { once: true });
      const finish = () => {
        signal?.removeEventListener("abort", cancel);
        contexts.delete(id);
        clearTimeout(timer);
      };
      const timer = setTimeout(
        () => abort(new Error(`build ${value.operation} exceeded ${timeoutMs}ms; process terminated`)),
        timeoutMs
      );
      pending.set(id, {
        resolve(value2) {
          finish();
          resolve3(value2);
        },
        reject(error) {
          finish();
          reject(error);
        }
      });
      child.send({ ...value, id }, (error) => {
        if (error) abort(error);
      });
      if (signal?.aborted) cancel();
    });
  }
  async function dispose() {
    if (disposed) return;
    try {
      if (child?.connected && !terminated)
        await request({ operation: "dispose" }, options.cleanupTimeoutMs ?? 5e3);
    } finally {
      disposed = true;
      abort(new Error("build session disposed"));
      if (child && child.exitCode === null && child.signalCode === null) {
        await new Promise((resolve3) => child?.once("exit", () => resolve3()));
      }
      await rm(temporary, { recursive: true, force: true });
    }
  }
  try {
    const compiled = await compileNodePluginPrograms(
      facts,
      "build",
      inventory,
      temporary,
      resolution
    );
    for (const file of compiled.watchFiles) watchFiles.add(file);
    const bundled = fileURLToPath(new URL("./build-process.mjs", import.meta.url));
    const sourceTest = fileURLToPath(new URL("../../dist/build-process.mjs", import.meta.url));
    child = fork(existsSync(bundled) ? bundled : sourceTest, [], {
      cwd: facts.root,
      serialization: "advanced",
      stdio: ["ignore", "inherit", "inherit", "ipc"]
    });
    child.on(
      "message",
      (message) => {
        if ("callback" in message) {
          const context = contexts.get(message.request);
          void (async () => {
            try {
              if (!context) throw new Error("import request is no longer active");
              let value;
              switch (message.operation) {
                case "readSource":
                  value = await context.readSource();
                  break;
                case "readSibling":
                  value = await context.readSibling(
                    ...message.args
                  );
                  break;
                case "decodeImage":
                  value = await context.decodeImage(
                    ...message.args
                  );
                  break;
              }
              if (child?.connected) child.send({ callback: message.callback, ok: true, value });
            } catch (error) {
              if (child?.connected) child.send({ callback: message.callback, ok: false, error });
            }
          })();
          return;
        }
        const handle = pending.get(message.id);
        if (!handle) return;
        pending.delete(message.id);
        if (message.ok) handle.resolve(message.value);
        else handle.reject(message.error);
      }
    );
    child.on("error", abort);
    child.on("exit", (code, signal) => {
      abort(new Error(`build process exited (${code ?? signal})`));
    });
    const started = await request(
      {
        operation: "start",
        entry: resolve(temporary, "compiled", "entry.mjs"),
        root: facts.roots.build,
        definitions: records.map((record) => record.definition),
        sessionId: randomUUID()
      },
      options.startupTimeoutMs ?? 6e4
    );
    const keys = new Set(builtins.map((cooker) => cooker.key));
    const remote = started.cookers.map((key) => {
      if (keys.has(key)) throw new TypeError(`duplicate builtin/project cooker ${key}`);
      keys.add(key);
      return { key, cook: (input) => request({ operation: "cook", key, input }) };
    });
    const importers = started.importers.map(
      (descriptor) => ({
        key: descriptor.key,
        import(context) {
          const { source, subAssets, importSettings, sourceOverrides } = context;
          return request(
            {
              operation: "import",
              key: descriptor.key,
              context: {
                source,
                subAssets,
                importSettings,
                ...sourceOverrides === void 0 ? {} : { sourceOverrides }
              }
            },
            options.operationTimeoutMs ?? 6e4,
            context
          );
        },
        capabilities: {
          ...descriptor.decodeImage ? {
            decodeImage: (...args) => request({
              operation: "decodeImage",
              key: descriptor.key,
              args
            })
          } : {},
          ...descriptor.publish ? {
            catalog: {
              publish: (input) => request({ operation: "publish", key: descriptor.key, input })
            }
          } : {}
        },
        ...descriptor.finalize ? {
          finalize: (product, options2) => request({
            operation: "finalize",
            key: descriptor.key,
            product,
            urls: Object.fromEntries(
              product.assets.flatMap(
                (asset) => Object.entries(asset.artifacts ?? {}).map(([path, artifact]) => [
                  path,
                  options2.artifactUrl({
                    path,
                    bytes: artifact.bytes,
                    mimeType: artifact.mediaType
                  })
                ])
              )
            )
          })
        } : {}
      })
    );
    return {
      appOptions: started.appOptions.pipelineLibrary === void 0 ? started.appOptions : {
        ...started.appOptions,
        pipelineLibrary: await (await import('./pipeline-library-JKXGS7BB.mjs')).precomputePipelineLibrary(started.appOptions.pipelineLibrary)
      },
      delivery: started.delivery,
      cookers: [...builtins, ...remote],
      importers,
      watchFiles,
      dispose,
      runTool(tool, args, options2 = {}) {
        const {
          signal,
          capabilityResolver: _resolver,
          owner: _owner,
          caller: _caller,
          ...wire
        } = options2;
        return request(
          { operation: "tool", tool, args, options: wire },
          (options2.deadlineMs ?? 6e4) + 5e3,
          void 0,
          signal
        );
      }
    };
  } catch (cause) {
    try {
      await dispose();
    } catch (cleanup) {
      throw new AggregateError([cause, cleanup], "build startup and cleanup failed");
    }
    throw cause;
  }
}

export { compileNodePluginPrograms, loadProjectCookers };
//# sourceMappingURL=chunk-ZDSMIZQ7.mjs.map
//# sourceMappingURL=chunk-ZDSMIZQ7.mjs.map