#!/usr/bin/env node
import { nativePreviewDescriptors } from './chunk-WTUHF6YQ.mjs';
import { animationPlaybackSchema } from './chunk-6AKTNSSW.mjs';
import { randomUUID, createHash } from 'crypto';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { PACK_AUTHORING_OPERATION_DESCRIPTORS } from '@forgeax/engine-pack/source';
import '@forgeax/engine-plugin';
import { PluginRealmSchema } from '@forgeax/engine-project';
import { operationCommandPath } from '@forgeax/engine-tool-runtime';

var buildArgsSchema = {
  parse(value) {
    if (value === null || typeof value !== "object")
      return { ok: false, error: "expected an options object" };
    const options = value;
    if (options.target !== void 0 && !["browser", "wechat", "tauri"].includes(options.target))
      return { ok: false, error: "target must be browser, wechat or tauri" };
    if (options.appid !== void 0 && !/^wx[0-9a-f]{16}$/.test(options.appid))
      return { ok: false, error: "appid must be wx followed by 16 hexadecimal characters" };
    if (options.appid !== void 0 && options.target !== "wechat")
      return { ok: false, error: "appid belongs to the wechat target" };
    if (options.materialProfile !== void 0 && options.materialProfile !== "webgpu-storage")
      return { ok: false, error: "materialProfile must be webgpu-storage when provided" };
    if (options.materialProfile !== void 0 && options.target === "wechat")
      return {
        ok: false,
        error: "webgpu-storage materialProfile requires a desktop WebGPU target"
      };
    if ("sourcemap" in value && value.sourcemap !== void 0 && value.sourcemap !== "hidden")
      return { ok: false, error: "sourcemap must be hidden when provided" };
    return { ok: true, value };
  },
  describe: JSON.stringify({
    type: "object",
    properties: {
      root: { type: "string" },
      base: { type: "string" },
      outDir: { type: "string" },
      target: { type: "string", enum: ["browser", "wechat", "tauri"] },
      appid: { type: "string", description: "WeChat Mini Game AppID; omitted uses tourist mode." },
      materialProfile: {
        type: "string",
        enum: ["webgpu-storage"],
        description: "Validation-only storage-capable WebGPU raster build; omits portable fallback and ray programs."
      },
      sourcemap: {
        type: "string",
        enum: ["hidden"],
        description: "Emit hidden source maps for the actual production bundles."
      },
      json: { type: "boolean" },
      animation: animationPlaybackSchema
    }
  })
};
var pluginCreateArgsSchema = {
  parse(value) {
    if (value === null || typeof value !== "object")
      return { ok: false, error: "expected plugin asset options" };
    return { ok: true, value };
  },
  describe: '{"type":"object","required":["path"],"additionalProperties":false,"properties":{"path":{"type":"string","description":"New .pack.ts (same-file behavior by default) or .pack.json (requires module)."},"module":{"type":"string","description":"Optional existing implementation module, relative to the Pack or an npm specifier."},"export":{"type":"string","description":"Named runtime export; defaults to plugin for same-file authoring, default for an existing module."},"packageId":{"type":"string"},"sourceKey":{"type":"string"},"config":{},"dryRun":{"type":"boolean"},"root":{"type":"string"}}}'
};
var pluginInspectArgsSchema = {
  parse(value) {
    if (value === null || typeof value !== "object")
      return { ok: false, error: "expected plugin inspect options object" };
    const id = value.guid;
    if (id !== void 0 && typeof id !== "string")
      return { ok: false, error: "expected id to be a string when provided" };
    return { ok: true, value };
  },
  describe: '{"type":"object","properties":{"guid":{"type":"string"},"root":{"type":"string"}}}'
};
var pluginRootArgsSchema = {
  parse(value) {
    if (!value || typeof value !== "object") return { ok: false, error: "expected root options" };
    return { ok: true, value };
  },
  describe: JSON.stringify({
    type: "object",
    required: ["realm", "guid"],
    properties: {
      realm: { enum: PluginRealmSchema.options },
      guid: { type: ["string", "null"] },
      root: { type: "string" }
    }
  })
};
var packAuthoringArgsSchema = {
  parse(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "expected a Pack authoring operation object" };
    }
    const operation = value;
    if (typeof operation.requestId !== "string" || operation.requestId.trim().length === 0) {
      return { ok: false, error: "requestId must be a non-empty caller-minted string" };
    }
    return { ok: true, value };
  },
  describe: '{"type":"object","required":["requestId"],"properties":{"requestId":{"type":"string","minLength":1},"expectedRevision":{"type":"string"},"subject":{"type":"string"},"sourcePath":{"type":"string"},"sourceRoot":{"type":"string"},"targetPath":{"type":"string"},"packageId":{"type":"string","format":"uuid"},"parentPackageId":{"type":"string","format":"uuid"},"parent":{"type":"string","format":"uuid"},"sourceKey":{"type":"string","pattern":"^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*$"},"format":{"enum":["pack.ts","pack.json"]},"require":{"enum":["identity","present","ready"]},"values":{"type":"object"},"initialAssets":{"type":"object"},"parameters":{"type":"array","minItems":1}}}'
};
var packAuthoringResultSchema = {
  parse(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "expected a Pack authoring result object" };
    }
    return { ok: true, value };
  },
  describe: '{"type":"object"}'
};
var packRootSchema = { type: "string" };
var packStringSchema = { type: "string" };
var packBooleanSchema = { type: "boolean" };
var assetListInputSchema = {
  type: "object",
  properties: {
    root: packRootSchema,
    type: packStringSchema,
    limit: { type: "integer", minimum: 1, maximum: 256 },
    cursor: packStringSchema,
    json: packBooleanSchema
  },
  additionalProperties: false
};
var assetInspectInputSchema = {
  type: "object",
  properties: {
    root: packRootSchema,
    subject: packStringSchema,
    json: packBooleanSchema,
    parametersOnly: {
      type: "boolean",
      description: "Read and validate only .pack.ts parameter declarations, with generation/runtime mode, bindings and source locations. No module execution, project scan, generation or runtime target validation."
    }
  },
  required: ["subject"],
  additionalProperties: false
};
var assetResolveInputSchema = {
  type: "object",
  properties: {
    root: packRootSchema,
    subject: packStringSchema,
    packageId: packStringSchema,
    sourceKey: packStringSchema,
    require: { enum: ["identity", "present", "ready"] },
    json: packBooleanSchema
  },
  additionalProperties: false
};
var assetVerifyInputSchema = {
  type: "object",
  properties: { root: packRootSchema, json: packBooleanSchema },
  additionalProperties: false
};
function packReadArgsSchemaFor(inputSchema) {
  return {
    parse(value) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return packAuthoringArgsSchema.parse(value);
      }
      return packAuthoringArgsSchema.parse({ requestId: randomUUID(), ...value });
    },
    describe: JSON.stringify(inputSchema)
  };
}
var operationTitles = {
  "asset.list": "List Pack assets",
  "asset.inspect": "Inspect Pack subject",
  "asset.resolve": "Resolve Pack asset identity",
  "asset.verify": "Verify Pack authoring",
  "asset.source.create": "Create Pack source",
  "asset.source.clone": "Clone Pack source closure",
  "asset.source.import": "Import Pack source closure",
  "asset.source.instance.create": "Create Pack instance",
  "asset.source.values.apply": "Apply Pack instance values",
  "asset.source.rebuild": "Rebuild Pack source",
  "asset.source.cold-cook": "Cold-cook Pack source"
};
var packAuthoringToolDescriptors = PACK_AUTHORING_OPERATION_DESCRIPTORS.map((operation) => ({
  id: operation.id,
  path: operationCommandPath(operation.id),
  title: operationTitles[operation.id] ?? operation.id,
  summary: operation.readOnly ? "Reads Pack identity, topology, inheritance, or current readiness without building or writing." : "Runs the Pack authoring gateway with requestId and revision CAS semantics.",
  realm: "build",
  argsSchema: operation.id === "asset.list" ? packReadArgsSchemaFor(assetListInputSchema) : operation.id === "asset.inspect" ? packReadArgsSchemaFor(assetInspectInputSchema) : operation.id === "asset.resolve" ? packReadArgsSchemaFor(assetResolveInputSchema) : operation.id === "asset.verify" ? packReadArgsSchemaFor(assetVerifyInputSchema) : packAuthoringArgsSchema,
  resultSchema: packAuthoringResultSchema,
  evidence: []
}));
var resultSchema = {
  parse: (value) => ({ ok: true, value }),
  describe: '{"type":"object"}'
};
var pluginMigrationDescriptor = {
  id: "project.migrate",
  path: ["project", "migrate"],
  title: "Migrate plugin assets",
  summary: "Converts a static schema 2 project into a validated schema 3 candidate directory.",
  realm: "build",
  evidence: [],
  resultSchema,
  argsSchema: {
    parse(value) {
      if (!value || typeof value !== "object" || typeof value.output !== "string")
        return { ok: false, error: "output is required" };
      return { ok: true, value };
    },
    describe: '{"type":"object","required":["output"],"properties":{"output":{"type":"string"},"root":{"type":"string"}}}'
  }
};
var projectBuildDescriptor = {
  id: "project.build",
  path: operationCommandPath("project.build"),
  title: "Build project",
  summary: "Builds the project through the existing Vite and Pack authorities.",
  realm: "build",
  argsSchema: buildArgsSchema,
  resultSchema,
  evidence: []
};
var authorPluginCreateDescriptor = {
  id: "asset.plugin.create",
  path: operationCommandPath("asset.plugin.create"),
  title: "Create plugin asset",
  summary: "Creates a same-file .pack.ts behavior, or a Pack referencing an existing module.",
  realm: "build",
  argsSchema: pluginCreateArgsSchema,
  resultSchema,
  evidence: []
};
var authorPluginInspectDescriptor = {
  id: "asset.plugin.inspect",
  path: operationCommandPath("asset.plugin.inspect"),
  title: "Inspect project plugins",
  summary: "Inspects source plugin definitions and project root references.",
  realm: "build",
  argsSchema: pluginInspectArgsSchema,
  resultSchema,
  evidence: []
};
var authorPluginRootDescriptor = {
  id: "project.root.set",
  path: ["project", "root", "set"],
  title: "Set project root",
  summary: "References a plugin asset in one realm; null removes the root reference.",
  realm: "build",
  argsSchema: pluginRootArgsSchema,
  resultSchema,
  evidence: []
};
({
  path: operationCommandPath("preview.run")});
({
  path: operationCommandPath("preview.analyze")});
var defaultToolDescriptors = [
  projectBuildDescriptor,
  authorPluginCreateDescriptor,
  authorPluginRootDescriptor,
  pluginMigrationDescriptor,
  authorPluginInspectDescriptor,
  ...packAuthoringToolDescriptors,
  ...nativePreviewDescriptors
];
function projectDescriptor(descriptor) {
  return {
    id: descriptor.id,
    path: descriptor.path ?? operationCommandPath(descriptor.id),
    title: descriptor.title,
    summary: descriptor.summary,
    realm: descriptor.realm,
    evidence: [...descriptor.evidence],
    ...descriptor.argsSchema.describe === void 0 ? {} : { argsSchema: descriptor.argsSchema.describe },
    ...descriptor.resultSchema.describe === void 0 ? {} : { resultSchema: descriptor.resultSchema.describe }
  };
}
function requiredAuthorityDigest(authority) {
  if (authority.authorityDigest === void 0) {
    throw new TypeError("Catalog materialization requires an authority digest");
  }
  return authority.authorityDigest;
}
function digestCatalog(authorityDigest, entries) {
  return `sha256:${createHash("sha256").update(JSON.stringify({ authorityDigest, entries })).digest("hex")}`;
}
function digestAuthority(bytes) {
  const hash = createHash("sha256");
  for (const value of bytes) hash.update(value);
  return `sha256:${hash.digest("hex")}`;
}
function projectionValid(catalog, authorityDigest, descriptors = defaultToolDescriptors) {
  if (catalog === null || typeof catalog !== "object") return false;
  const value = catalog;
  const expectedEntries = descriptors.map(projectDescriptor).sort((left, right) => left.id.localeCompare(right.id));
  return value.schemaVersion === "1.0.0" && value.authorityDigest === authorityDigest && Array.isArray(value.entries) && JSON.stringify(value.entries) === JSON.stringify(expectedEntries) && value.digest === digestCatalog(authorityDigest, value.entries);
}
function createProjectToolCatalogAuthority(rootInput, descriptors = defaultToolDescriptors) {
  const root = resolve(rootInput);
  return {
    root,
    projectionPath: resolve(root, ".forgeax/generated/tool-catalog.json"),
    async read() {
      const [forge, packageJson] = await Promise.all([
        readFile(resolve(root, "forge.json")),
        readFile(resolve(root, "package.json"))
      ]);
      return { authorityDigest: digestAuthority([forge, packageJson]), descriptors };
    }
  };
}
async function loadToolCatalog(authority, descriptors = defaultToolDescriptors) {
  const read = authority.read;
  if (read === void 0) {
    if (authority.authorityDigest === void 0) {
      return {
        ok: false,
        error: {
          code: "tool-catalog-authority-unreadable",
          expected: "an injectable project authority reader",
          hint: "Create a project authority from a real project root before listing tools.",
          detail: { reason: "authority reader is missing" }
        }
      };
    }
    return { ok: true, value: materializeToolDescriptorCatalog(descriptors, authority) };
  }
  let snapshot;
  try {
    snapshot = await read();
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: "tool-catalog-authority-unreadable",
        expected: "project authority files to be readable",
        hint: "Repair forge.json and package.json, then retry catalog rebuild.",
        detail: { reason: cause instanceof Error ? cause.message : String(cause) }
      }
    };
  }
  const projectionPath = authority.projectionPath;
  if (projectionPath !== void 0) {
    try {
      const current = JSON.parse(await readFile(projectionPath, "utf8"));
      if (projectionValid(current, snapshot.authorityDigest, snapshot.descriptors)) {
        return { ok: true, value: current };
      }
    } catch {
    }
  }
  const catalog = materializeToolDescriptorCatalog(snapshot.descriptors, {
    authorityDigest: snapshot.authorityDigest
  });
  if (projectionPath !== void 0) {
    try {
      await mkdir(resolve(projectionPath, ".."), { recursive: true });
      await writeFile(projectionPath, `${JSON.stringify(catalog, null, 2)}
`, "utf8");
    } catch (cause) {
      return {
        ok: false,
        error: {
          code: "tool-catalog-projection-invalid",
          expected: "the generated catalog projection to be writable",
          hint: "Restore write access to .forgeax/generated and retry cold rebuild.",
          detail: { reason: cause instanceof Error ? cause.message : String(cause) }
        }
      };
    }
  }
  return { ok: true, value: catalog };
}
function materializeToolDescriptorCatalog(descriptors, authority) {
  const entries = descriptors.map(projectDescriptor).sort((left, right) => left.id.localeCompare(right.id));
  const authorityDigest = requiredAuthorityDigest(authority);
  return {
    schemaVersion: "1.0.0",
    authorityDigest,
    digest: digestCatalog(authorityDigest, entries),
    entries
  };
}
function listTools(catalog) {
  return catalog.entries;
}
function describeTool(catalog, id) {
  return catalog.entries.find((entry) => entry.id === id);
}

export { assetInspectInputSchema, assetListInputSchema, assetResolveInputSchema, assetVerifyInputSchema, authorPluginCreateDescriptor, authorPluginInspectDescriptor, authorPluginRootDescriptor, createProjectToolCatalogAuthority, describeTool, listTools, loadToolCatalog, materializeToolDescriptorCatalog, packAuthoringToolDescriptors, pluginMigrationDescriptor, projectBuildDescriptor };
//# sourceMappingURL=chunk-6PBPEM2R.mjs.map
//# sourceMappingURL=chunk-6PBPEM2R.mjs.map