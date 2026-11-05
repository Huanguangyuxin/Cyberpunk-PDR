#!/usr/bin/env node
import { assetVerifyInputSchema, assetResolveInputSchema, assetInspectInputSchema, assetListInputSchema } from './chunk-6PBPEM2R.mjs';
import { createWorkspaceLiveTools } from './chunk-HIR5RTHU.mjs';
import { createOperationHistoryTools } from './chunk-ZYPIUSIT.mjs';
import './chunk-4CLUR564.mjs';
import './chunk-WTUHF6YQ.mjs';
import './chunk-OMR3CVHO.mjs';
import { RHI_READ_INPUT_SCHEMA, RHI_INSPECT_INPUT_SCHEMA } from './chunk-DVDZY2BO.mjs';
import { executionWorkers, executionWorkersSchema } from './chunk-UTXAIODQ.mjs';
import { animationPlayback, animationPlaybackSchema } from './chunk-6AKTNSSW.mjs';
import './chunk-X5IGMUF7.mjs';
import { readProjectStartupTimeoutMs } from './chunk-VNP4GISC.mjs';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { defineCommand, toolJsonSchema, operationCommandPath } from '@forgeax/engine-tool-runtime';

var string = { type: "string" };
var captureBackend = {
  type: "string",
  enum: ["auto", "hardware", "software"]
};
var boolean = { type: "boolean" };
var number = { type: "number" };
var integer = { type: "integer" };
var port = { type: "integer", minimum: 0, maximum: 65535 };
var liveIdentity = { revision: string };
var schema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false
});
var root = { root: string };
var commandSchemas = {
  "backend.start": schema({ ...root, hostPack: string }),
  "backend.status": schema(root),
  "backend.stop": schema(root),
  "project.new": schema({
    ...root,
    template: string,
    id: string,
    name: string,
    packageName: string,
    dryRun: boolean
  }),
  "project.init": schema({ ...root, install: boolean, dryRun: boolean }),
  "project.check": schema({ ...root, json: boolean }),
  "project.test": schema({ ...root, json: boolean }),
  "project.package": schema({ ...root, output: string, format: string, json: boolean }),
  "project.preview": schema({ ...root, port, json: boolean }),
  "project.capture": schema({
    ...root,
    output: string,
    backend: captureBackend,
    headless: boolean,
    port,
    width: integer,
    height: integer,
    waitMs: integer,
    requireUi: boolean,
    deterministic: boolean
  }),
  "project.engine.status": schema({ ...root, json: boolean }),
  "project.engine.use-local": schema({ ...root, path: string, json: boolean }),
  "project.engine.unlink": schema({ ...root, json: boolean }),
  "project.engine.check": schema({ ...root, json: boolean }),
  "project.skill.install": schema({ ...root, json: boolean }),
  "project.skill.verify": schema({ ...root, json: boolean }),
  "asset.import": schema({ ...root, path: string, dryRun: boolean, json: boolean }, ["path"]),
  "asset.list": assetListInputSchema,
  "asset.inspect": assetInspectInputSchema,
  "asset.resolve": assetResolveInputSchema,
  "asset.verify": assetVerifyInputSchema,
  "asset.shader.check": schema({ ...root, path: string, json: boolean }),
  "asset.preview": schema(
    {
      ...root,
      kind: string,
      guid: string,
      backend: captureBackend,
      headless: boolean,
      width: integer,
      height: integer,
      output: string,
      json: boolean
    },
    ["kind", "guid"]
  ),
  "asset.atlas": schema(
    {
      ...root,
      input: string,
      name: string,
      output: string,
      maxAtlasSize: integer,
      json: boolean
    },
    ["input", "name"]
  ),
  "sdk.install": schema({ ...root, version: string }),
  "preview.analyze": schema({ ...root, artifact: string, json: boolean }),
  "rhi.capture": schema({ ...root, output: string, json: boolean }),
  "rhi.summary": schema({ ...root, artifact: string, digest: string, json: boolean }, ["artifact"]),
  "rhi.timing": schema({ ...root, artifact: string, digest: string, json: boolean }, ["artifact"]),
  "rhi.inspect": schema(
    {
      ...root,
      ...RHI_INSPECT_INPUT_SCHEMA.properties,
      artifact: string,
      digest: string,
      json: boolean
    },
    RHI_INSPECT_INPUT_SCHEMA.required
  ),
  "rhi.read": schema(
    {
      ...root,
      ...RHI_READ_INPUT_SCHEMA.properties,
      artifact: string,
      digest: string,
      json: boolean
    },
    RHI_READ_INPUT_SCHEMA.required
  ),
  "profile.capture": schema({
    ...root,
    output: string,
    frameLimit: integer,
    eventLimit: integer,
    revision: string,
    json: boolean
  }),
  "profile.summary": schema({ ...root, artifact: string, json: boolean }),
  "profile.frame": schema({ ...root, artifact: string, frameId: integer, json: boolean }),
  "profile.phase": schema({
    ...root,
    artifact: string,
    source: string,
    phase: string,
    json: boolean
  }),
  "profile.compare": schema({ ...root, leftFile: string, rightFile: string, json: boolean }, [
    "leftFile",
    "rightFile"
  ]),
  "dev.start": schema({
    ...root,
    headless: boolean,
    backend: captureBackend,
    workers: executionWorkersSchema,
    animation: animationPlaybackSchema,
    rhiCapture: boolean
  }),
  "dev.status": schema({ ...root }),
  "dev.verify": schema(
    {
      ...root,
      ...liveIdentity,
      output: string,
      checkpoint: string,
      requireUi: boolean,
      timeoutMs: { type: "integer", minimum: 1 }
    },
    ["revision"]
  ),
  "dev.pipelines.export": schema({ ...root, ...liveIdentity, output: string }, ["revision"]),
  "dev.reload": schema({ ...root }),
  "dev.stop": schema({ ...root }),
  "dev.eval": schema(
    { ...root, ...liveIdentity, code: string, timeoutMs: integer, lease: boolean },
    ["code", "revision"]
  ),
  "dev.find": schema({
    ...root,
    ...liveIdentity,
    name: string,
    limit: { type: "integer", minimum: 1, maximum: 100 }
  }),
  "dev.camera.release": schema({ ...root, ...liveIdentity }),
  "dev.camera.get": schema({ ...root, ...liveIdentity }),
  "dev.camera.set": schema({
    ...root,
    ...liveIdentity,
    position: { type: "array", items: number, minItems: 3 },
    target: { type: "array", items: number, minItems: 3 },
    up: { type: "array", items: number, minItems: 3 },
    lens: { type: "object" },
    exposure: { type: "object" }
  }),
  "dev.focus": schema({
    ...root,
    ...liveIdentity,
    name: string,
    ref: string,
    distance: number,
    target: { type: "array", items: number, minItems: 3 },
    position: { type: "array", items: number, minItems: 3 },
    up: { type: "array", items: number, minItems: 3 }
  }),
  "dev.capture": schema({
    ...root,
    ...liveIdentity,
    output: string,
    checkpoint: {
      type: "string",
      description: "Wait for a game-published forgeaxCaptureReady value. Omit for an immediate snapshot; this is not an image name."
    }
  })
};
function commandSchema(id) {
  return commandSchemas[id] ?? schema({ ...root });
}
function result(value) {
  if (value.ok)
    return {
      ok: true,
      value: value.value,
      ...value.artifacts === void 0 ? {} : { artifacts: value.artifacts }
    };
  return {
    ok: false,
    error: {
      code: value.error.code,
      expected: value.error.expected,
      hint: value.error.hint,
      detail: value.error.detail
    },
    ...value.artifacts === void 0 ? {} : { artifacts: value.artifacts }
  };
}
function command(id, title, summary, execute, realm = "build", options = {}) {
  const argsSchema = options.schema ?? commandSchema(id);
  return defineCommand(
    {
      id,
      path: operationCommandPath(id),
      title,
      summary,
      realm,
      argsSchema: toolJsonSchema(argsSchema),
      resultSchema: toolJsonSchema({ type: "object" }),
      evidence: [],
      capabilities: options.capabilities ?? [],
      errors: options.errors ?? ["tool-invalid-args", "tool-capability-unavailable"],
      ...options.example === void 0 ? {} : { example: options.example },
      inputSchema: argsSchema
    },
    async (args, context) => result(await execute(args, context))
  );
}
function rootArgs(root2, args) {
  return { ...args, root: typeof args.root === "string" ? args.root : root2 };
}
function createUnifiedCommandContributions(projectRoot = process.cwd()) {
  const project = (id, title, summary, method, loadOwner = () => method === "sdkInstallCommand" ? import('./sdk-install-5G3QD6UA.mjs') : import('./commands-DABHGFZM.mjs')) => command(id, title, summary, async (args) => {
    const commands = await loadOwner();
    const handler = commands[method];
    if (handler === void 0) {
      return {
        ok: false,
        error: {
          code: "command-unavailable",
          expected: method,
          hint: "Install the matching DevKit command owner."
        }
      };
    }
    return handler(rootArgs(projectRoot, args));
  });
  const live = (id, title, summary, operation) => command(
    id,
    title,
    summary,
    async (args) => {
      const liveDev = await import('./live-dev-RDIRBVXD.mjs');
      if (operation === "status")
        return await liveDev.liveDevStatus(projectRoot);
      return await liveDev.liveDevControl(projectRoot, operation, args);
    },
    "host",
    {
      capabilities: ["live-instance", ...operation === "status" ? [] : ["world-observation"]],
      errors: [
        ...operation === "status" || operation === "stop" ? [] : ["live-not-running"],
        "live-not-ready",
        "live-revision-required",
        "live-revision-stale",
        "live-world-stale",
        "live-instance-changed"
      ],
      ...operation === "status" ? {} : {
        example: operation === "focus" ? { name: "Player" } : operation === "eval" ? {
          revision: "<from dev status>",
          code: "return simulation.execution.report()"
        } : {}
      }
    }
  );
  const start = command(
    "dev.start",
    "Start live project",
    "Starts one persistent DevKit owner and its controlled browser Page.",
    async (args) => await (await import('./live-dev-RDIRBVXD.mjs')).startLiveDev(projectRoot, {
      ...typeof args.headless === "boolean" ? { headless: args.headless } : {},
      ...args.backend === "auto" || args.backend === "hardware" || args.backend === "software" ? { backend: args.backend } : {},
      ...args.workers === void 0 ? {} : { workers: executionWorkers(args.workers) },
      ...args.animation === void 0 ? {} : { animation: animationPlayback(args.animation) },
      ...typeof args.rhiCapture === "boolean" ? { rhiCapture: args.rhiCapture } : {}
    }),
    "host"
  );
  const offlinePreviewAnalysis = command(
    "preview.analyze",
    "Analyze preview artifacts",
    "Validates artifact identity and required evidence without starting a browser.",
    async (args) => {
      const { analyzePreviewArtifacts } = await import('./offline-analysis-DSQKDYV3.mjs');
      const artifact = typeof args.artifact === "string" ? resolve(projectRoot, args.artifact) : void 0;
      if (artifact === void 0) {
        return {
          ok: false,
          error: {
            code: "tool-invalid-args",
            expected: "--artifact to point to a preview manifest or report",
            hint: "Pass the retained .forgeax/tool-runs/.../manifest.json or report.json path.",
            detail: {}
          }
        };
      }
      let raw;
      try {
        raw = await readFile(artifact, "utf8");
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: "preview-artifact-read-failed",
            expected: "the preview artifact file to be readable",
            hint: "Pass a retained preview manifest or report path, then retry.",
            detail: {
              path: artifact,
              reason: cause instanceof Error ? cause.message : String(cause)
            }
          }
        };
      }
      let value;
      try {
        value = JSON.parse(raw);
      } catch (cause) {
        return {
          ok: false,
          error: {
            code: "preview-artifact-invalid",
            expected: "the preview artifact file to contain JSON",
            hint: "Regenerate the preview artifacts and pass manifest.json or report.json.",
            detail: {
              path: artifact,
              reason: cause instanceof Error ? cause.message : String(cause)
            }
          }
        };
      }
      const isManifest = (candidate) => candidate !== null && typeof candidate === "object" && !Array.isArray(candidate) && typeof Reflect.get(candidate, "schemaVersion") === "string" && Reflect.get(candidate, "identity") !== void 0 && Array.isArray(Reflect.get(candidate, "artifacts"));
      let manifest = value;
      if (!isManifest(manifest)) {
        const sibling = resolve(dirname(artifact), "manifest.json");
        try {
          manifest = JSON.parse(await readFile(sibling, "utf8"));
        } catch {
          return {
            ok: false,
            error: {
              code: "preview-artifact-manifest-missing",
              expected: "the artifact or its sibling manifest.json to contain a preview manifest",
              hint: "Pass the retained manifest.json from the same ToolRun directory.",
              detail: { artifact, manifest: sibling }
            }
          };
        }
      }
      const analyzed = analyzePreviewArtifacts({ manifest });
      return analyzed.ok ? { ok: true, value: analyzed.value } : { ok: false, error: analyzed.error };
    }
  );
  const assetPreview = command(
    "asset.preview",
    "Preview an asset",
    "Produces canonical GUID-based resource evidence through the owning preview plugin.",
    async (args, context) => {
      const kind = typeof args.kind === "string" ? args.kind : "mesh";
      if (kind === "scene") {
        const { runScenePreviewTool } = await import('./scene-preview-TR6EKSNT.mjs');
        const terminal2 = await runScenePreviewTool(args, projectRoot);
        return terminal2.outcome === "succeeded" ? { ok: true, value: terminal2.result, artifacts: terminal2.artifacts } : { ok: false, error: terminal2.failure, artifacts: terminal2.artifacts };
      }
      const nativePreview = await import('./native-preview-TX5YCPBX.mjs');
      const catalog = await import('./preview-catalog-G5SILA5G.mjs');
      const contribution = catalog.nativePreviewTools.find(
        (candidate) => candidate.descriptor.id === `asset.${kind}.preview`
      );
      if (contribution === void 0) {
        return {
          ok: false,
          error: {
            code: "asset-preview-kind-unavailable",
            expected: "kind to select material, mesh, texture, or vfx",
            hint: "Pass { kind, guid } and retry with one of the admitted preview owners.",
            detail: { kind }
          }
        };
      }
      const request = { guid: args.guid };
      const terminal = await nativePreview.runNativePreviewTool(
        contribution,
        request,
        {
          signal: context.signal,
          ...context.snapshot === void 0 ? {} : { snapshot: context.snapshot }
        },
        projectRoot,
        {
          ...args.backend === "auto" || args.backend === "hardware" || args.backend === "software" ? { backend: args.backend } : {},
          ...typeof args.headless === "boolean" ? { headless: args.headless } : {},
          ...typeof args.width === "number" ? { width: args.width } : {},
          ...typeof args.height === "number" ? { height: args.height } : {},
          ...typeof args.output === "string" ? { output: args.output } : {}
        }
      );
      return terminal.outcome === "succeeded" ? { ok: true, value: terminal.result, artifacts: terminal.artifacts } : { ok: false, error: terminal.failure, artifacts: terminal.artifacts };
    },
    "host"
  );
  const assetAtlas = command(
    "asset.atlas",
    "Build asset atlas",
    "Builds a deterministic PNG atlas and sidecar through the Pack producer.",
    async (args) => ({
      ...await (async () => {
        const input = typeof args.input === "string" ? args.input : void 0;
        const name = typeof args.name === "string" ? args.name : void 0;
        if (input === void 0 || name === void 0) {
          return {
            ok: false,
            error: {
              code: "tool-invalid-args",
              expected: "--input <glob> and --name <prefix>",
              hint: "Pass the image glob and output prefix, then retry.",
              detail: {}
            }
          };
        }
        const { runAtlas } = await import('@forgeax/engine-pack/cli-asset');
        const stdout = [];
        const stderr = [];
        const rest = ["--input", input, "--name", name];
        if (typeof args.output === "string") rest.push("--output", args.output);
        if (typeof args.maxAtlasSize === "number")
          rest.push("--max-atlas-size", String(args.maxAtlasSize));
        const exitCode = await runAtlas(rest, {
          cwd: projectRoot,
          stdoutWrite: (line) => stdout.push(line),
          stderrWrite: (line) => stderr.push(line)
        });
        if (exitCode !== 0) {
          let error = {
            code: "asset-atlas-failed",
            expected: "the Pack atlas producer to complete",
            hint: stderr.at(-1) ?? "Inspect the atlas inputs and retry.",
            detail: { exitCode }
          };
          const raw = stderr.at(-1);
          if (raw !== void 0) {
            try {
              const parsed = JSON.parse(raw);
              if (typeof parsed.code === "string") error = { ...error, ...parsed };
            } catch {
            }
          }
          return { ok: false, error };
        }
        const output = typeof args.output === "string" ? args.output : projectRoot;
        return {
          ok: true,
          value: {
            root: projectRoot,
            name,
            output,
            artifacts: [`${name}.atlas.png`, `${name}.atlas.meta.json`],
            ...stdout.length === 0 ? {} : { producer: stdout.join("\n") }
          }
        };
      })()
    }),
    "build",
    {
      capabilities: ["asset-atlas-producer"],
      errors: ["atlas-empty-input", "atlas-size-exceeded", "atlas-region-mismatch"],
      example: { input: "assets/frames/*.png", name: "walk", output: "dist/assets" }
    }
  );
  const rhi = (operation, summary) => command(
    operation,
    operation,
    summary,
    async (args) => {
      if (operation === "rhi.capture") {
        const liveDev = await import('./live-dev-RDIRBVXD.mjs');
        return await liveDev.liveDevControl(projectRoot, "rhi/capture", args);
      }
      const { runCliRhiDebugOperation } = await import('./cli-context-NJILAF5W.mjs');
      const outcome = await runCliRhiDebugOperation(operation, args);
      return outcome.ok ? { ok: true, value: JSON.parse(JSON.stringify(outcome.value)) } : { ok: false, error: outcome.error };
    },
    "host"
  );
  const profile = (operation, summary) => command(
    `profile.${operation}`,
    `Profile ${operation}`,
    summary,
    async (args) => {
      if (operation === "capture") {
        const liveDev = await import('./live-dev-RDIRBVXD.mjs');
        return await liveDev.liveDevControl(
          projectRoot,
          "profile/capture",
          args
        );
      }
      const { runProfilerCli } = await import('@forgeax/engine-profiler/cli');
      const input = operation === "compare" ? "" : JSON.stringify(args.capture ?? args.artifact ?? args.input ?? args);
      const cliArgs = [operation];
      if (operation !== "compare" && typeof args.artifact === "string") {
        cliArgs.push("--file", args.artifact);
      }
      if (operation === "compare") {
        if (typeof args.leftFile === "string") cliArgs.push("--left-file", args.leftFile);
        if (typeof args.rightFile === "string") cliArgs.push("--right-file", args.rightFile);
      }
      if (operation === "frame" && typeof args.frameId === "number") {
        cliArgs.push("--frame-id", String(args.frameId));
      }
      if (operation === "phase") {
        if (typeof args.source === "string") cliArgs.push("--source", args.source);
        if (typeof args.phase === "string") cliArgs.push("--phase", args.phase);
      }
      const result2 = runProfilerCli(cliArgs, input);
      const raw = result2.exitCode === 0 ? result2.stdout : result2.stderr;
      let parsed = raw.trim();
      try {
        parsed = JSON.parse(raw);
      } catch {
      }
      if (result2.exitCode === 0) return { ok: true, value: parsed };
      const failure = typeof parsed === "object" && parsed !== null && "error" in parsed ? parsed.error : void 0;
      return {
        ok: false,
        error: failure ?? {
          code: "profile-command-failed",
          expected: "the profiler command to return a structured result",
          hint: "Inspect the profile artifact and retry the same operation.",
          detail: { output: parsed }
        }
      };
    },
    operation === "capture" ? "host" : "build"
  );
  const debugContributions = [
    offlinePreviewAnalysis,
    rhi("rhi.capture", "Captures one live frame into an ArtifactRef."),
    rhi("rhi.summary", "Lists work indices, pipeline entry points, and missing initial contents."),
    rhi("rhi.inspect", "Inspects one RHI work item on a fresh replay backend."),
    rhi(
      "rhi.read",
      "Batch-reads resources or bindings at work indices as records, image stats, atlas tiles and PNGs."
    ),
    rhi("rhi.timing", "Reports replay GPU nanoseconds per render and compute pass."),
    profile("capture", "Captures one bounded CPU profile from a live App host."),
    profile("summary", "Projects a profile ArtifactRef into an offline summary."),
    profile("frame", "Selects one frame from a profile ArtifactRef."),
    profile("phase", "Selects one phase from a profile ArtifactRef."),
    profile("compare", "Compares two profile ArtifactRefs without starting a browser.")
  ];
  return [
    ...createOperationHistoryTools(projectRoot),
    ...["start", "status", "stop"].map(
      (operation) => command(
        `backend.${operation}`,
        `Engine backend ${operation}`,
        `${operation} the Engine workspace backend independently of browsers and runs.`,
        async (args) => {
          const backend = await import('./backend-process-26TZPV6C.mjs');
          const selectedRoot = rootArgs(projectRoot, args).root;
          const hostPack = Reflect.get(args, "hostPack");
          if (operation === "start") {
            const startup = await readProjectStartupTimeoutMs(selectedRoot);
            if (!startup.ok) return startup;
            return {
              ok: true,
              value: await backend.startDevKitBackend(selectedRoot, {
                ...typeof hostPack === "string" ? { hostPack } : {},
                ...startup.value === void 0 ? {} : { startupTimeoutMs: startup.value }
              })
            };
          }
          return {
            ok: true,
            value: operation === "status" ? await backend.devKitBackendStatus(selectedRoot) : await backend.stopDevKitBackend(selectedRoot)
          };
        }
      )
    ),
    ...createWorkspaceLiveTools(projectRoot),
    project(
      "project.new",
      "Create project",
      "Creates a project from an SDK template.",
      "newCommand"
    ),
    project(
      "project.init",
      "Initialize project",
      "Initializes the local project and its dependencies.",
      "initCommand"
    ),
    project(
      "project.check",
      "Check project",
      "Runs project diagnostics and reports the supported HTML/CSS authoring profile without starting a live instance.",
      "doctorCommand"
    ),
    project("project.test", "Test project", "Runs the project test gate.", "testCommand"),
    project(
      "project.package",
      "Package project",
      "Packages the built project for delivery.",
      "packageCommand"
    ),
    project(
      "project.preview",
      "Preview project",
      "Serves the built project for inspection.",
      "previewCommand"
    ),
    project(
      "project.capture",
      "Capture project",
      "Starts a temporary project and captures evidence.",
      "browserCaptureCommand"
    ),
    project(
      "project.engine.status",
      "Engine status",
      "Reports the project Engine binding.",
      "engineStatusCommand"
    ),
    project(
      "project.engine.use-local",
      "Use local Engine",
      "Binds the project to a local Engine source.",
      "engineUseLocalCommand"
    ),
    project(
      "project.engine.unlink",
      "Unlink Engine",
      "Removes the local Engine binding.",
      "engineUnlinkCommand"
    ),
    project(
      "project.engine.check",
      "Check Engine",
      "Checks the project Engine binding.",
      "engineDoctorCommand"
    ),
    project(
      "project.skill.install",
      "Install skills",
      "Installs the project skill surface.",
      "skillInstallCommand"
    ),
    project(
      "project.skill.verify",
      "Verify skills",
      "Verifies the project skill surface.",
      "skillVerifyCommand"
    ),
    project(
      "asset.import",
      "Import asset",
      "Imports a source asset through the project asset authority.",
      "assetAddCommand"
    ),
    project(
      "asset.shader-check",
      "Check shader",
      "Checks authored shader sources.",
      "shaderCheckCommand"
    ),
    project(
      "sdk.install",
      "Install SDK",
      "Installs an SDK into a project directory.",
      "sdkInstallCommand"
    ),
    assetPreview,
    assetAtlas,
    ...debugContributions,
    start,
    live(
      "dev.status",
      "Live status",
      "Reports the current project phase, revision, frame, and unfinished evaluation.",
      "status"
    ),
    live(
      "dev.reload",
      "Reload live project",
      "Replaces the project execution environment and invalidates its old identity.",
      "reload"
    ),
    live(
      "dev.stop",
      "Stop live project",
      "Destroys the persistent page and project execution environment.",
      "stop"
    ),
    command(
      "dev.pipelines.export",
      "Export observed pipeline library",
      "Writes the current device pipeline recipes and compilation receipt for startup preparation.",
      async (args) => {
        const { exportPipelineLibrary } = await import('./pipeline-library-export-M3QJ4W7G.mjs');
        return exportPipelineLibrary(projectRoot, {
          revision: args.revision,
          ...typeof args.output === "string" ? { output: args.output } : {}
        });
      },
      "host",
      { capabilities: ["live-instance", "world-observation"] }
    ),
    live(
      "dev.eval",
      "Evaluate live project",
      "Evaluates through the project live inspection capability.",
      "eval"
    ),
    live(
      "dev.camera.get",
      "Get observation camera",
      "Reads transient observation camera state from the actual App realm.",
      "camera/get"
    ),
    live(
      "dev.camera.set",
      "Set observation camera",
      "Updates transient observation camera state in the actual App realm.",
      "camera/set"
    ),
    live(
      "dev.find",
      "Find scene entities",
      "Finds names and revision-bound references in the current World.",
      "find"
    ),
    live(
      "dev.camera.release",
      "Release observation camera",
      "Returns control to the game camera.",
      "camera/release"
    ),
    live(
      "dev.focus",
      "Focus observation camera",
      "Focuses an exact name or revision-bound reference; ambiguous names fail without moving.",
      "focus"
    ),
    live(
      "dev.verify",
      "Verify live runtime",
      "Validates the exact live execution and publishes strict runtime evidence; blocked checks fail.",
      "verify"
    ),
    live(
      "dev.capture",
      "Capture live project",
      "Captures the held Page after a confirmed submitted frame.",
      "capture"
    )
  ];
}

export { command, createUnifiedCommandContributions };
//# sourceMappingURL=unified-contributions-RT3NYQKT.mjs.map
//# sourceMappingURL=unified-contributions-RT3NYQKT.mjs.map