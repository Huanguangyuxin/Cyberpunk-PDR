#!/usr/bin/env node
import { encodePng } from '@forgeax/engine-image/png';
import { inspectBufferRecords, decodeTape, summarizeFrame, buildFrameModel, openReplay, workOutputs, bindingReadRequest, decodeBufferRecords, readbackImage, depthImage, extractTile, toRgba8, imageStats, tapeDigest } from '@forgeax/engine-rhi-debug';
import { ok } from '@forgeax/engine-types';

var RHI_TAPE_ARTIFACT_KIND = "rhi-tape";
var RHI_READ_LIMIT = 64;
function createRhiDebugOperationContext(host) {
  return {
    async captureFrame(input) {
      const captured = await host.captureFrame(input);
      if (!captured.ok) return captured;
      return ok({
        kind: RHI_TAPE_ARTIFACT_KIND,
        digest: captured.value.digest,
        source: captured.value.source ?? "rhi.capture",
        ...captured.value.path === void 0 ? {} : { path: captured.value.path },
        bytes: captured.value.bytes
      });
    },
    readArtifact: host.readArtifact,
    ...host.createReplayBackend === void 0 ? {} : { createReplayBackend: host.createReplayBackend },
    ...host.writeFile === void 0 ? {} : { writeFile: host.writeFile }
  };
}
var artifactRefSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: [RHI_TAPE_ARTIFACT_KIND] },
    digest: { type: "string" },
    source: { type: "string" },
    path: { type: "string" }
  },
  required: ["kind", "digest", "source"],
  additionalProperties: false
};
var summaryOutputSchema = {
  type: "object",
  properties: {
    artifact: artifactRefSchema,
    summary: { type: "object", additionalProperties: true }
  },
  required: ["artifact", "summary"],
  additionalProperties: false
};
var inspectOutputSchema = {
  type: "object",
  properties: {
    artifact: artifactRefSchema,
    inspection: { type: "object", additionalProperties: true },
    bufferRecords: { type: "object", additionalProperties: true }
  },
  required: ["artifact", "inspection"],
  additionalProperties: false
};
var recordLayoutSchema = {
  type: "object",
  properties: {
    stride: { type: "integer", minimum: 4, maximum: 65536 },
    fields: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          offset: { type: "integer", minimum: 0 },
          type: { type: "string", enum: ["f32", "u32", "i32", "f16"] },
          components: { type: "integer", minimum: 1, maximum: 4 }
        },
        required: ["name", "offset", "type", "components"],
        additionalProperties: false
      }
    }
  },
  required: ["stride", "fields"],
  additionalProperties: false
};
var recordsSchema = {
  type: "object",
  properties: {
    layout: recordLayoutSchema,
    first: { type: "integer", minimum: 0 },
    count: { type: "integer", minimum: 1, maximum: 4096 }
  },
  required: ["layout", "first", "count"],
  additionalProperties: false
};
var RHI_INSPECT_INPUT_SCHEMA = {
  type: "object",
  properties: {
    artifact: artifactRefSchema,
    workIndex: { type: "integer", minimum: 0 },
    buffer: {
      type: "object",
      properties: {
        resourceId: { type: "string" },
        first: { type: "integer", minimum: 0 },
        count: { type: "integer", minimum: 1, maximum: 4096 },
        layout: recordLayoutSchema
      },
      required: ["resourceId", "layout", "first", "count"],
      additionalProperties: false
    },
    fields: {
      type: "array",
      items: { type: "string", enum: ["bindings", "pipeline", "pixels", "outputs"] }
    }
  },
  required: ["artifact", "workIndex"],
  additionalProperties: false
};
var readImageSchema = {
  type: "object",
  properties: {
    format: { type: "string" },
    width: { type: "integer", minimum: 1 },
    height: { type: "integer", minimum: 1 },
    offset: { type: "integer", minimum: 0 },
    bytesPerRow: { type: "integer", minimum: 1 },
    tile: {
      type: "object",
      properties: {
        tileWidth: { type: "integer", minimum: 1 },
        tileHeight: { type: "integer", minimum: 1 },
        index: { type: "integer", minimum: 0 },
        border: { type: "integer", minimum: 0 },
        columns: { type: "integer", minimum: 1 }
      },
      required: ["tileWidth", "tileHeight", "index"],
      additionalProperties: false
    },
    exposure: { type: "number" },
    range: {
      type: ["array", "string"],
      items: { type: "number" },
      minItems: 2,
      maxItems: 2,
      description: "[min, max] or 'auto' for the finite RGB range"
    },
    depth: {
      type: ["boolean", "object"],
      properties: {
        near: { type: "number" },
        far: { type: "number" },
        reverseZ: { type: "boolean" },
        orthographic: { type: "boolean" }
      },
      additionalProperties: false,
      description: "true for raw grey depth, or {near,far,reverseZ?,orthographic?} for view distance"
    },
    tonemap: { type: "string", enum: ["clamp", "reinhard"] },
    png: { type: "string" }
  },
  additionalProperties: false
};
var RHI_READ_INPUT_SCHEMA = {
  type: "object",
  properties: {
    artifact: artifactRefSchema,
    reads: {
      type: "array",
      minItems: 1,
      maxItems: RHI_READ_LIMIT,
      items: {
        type: "object",
        properties: {
          resourceId: { type: "string" },
          binding: {
            type: "object",
            properties: {
              group: { type: "integer", minimum: 0 },
              binding: { type: "integer", minimum: 0 }
            },
            required: ["group", "binding"],
            additionalProperties: false
          },
          output: { type: "string" },
          workIndex: { type: "integer", minimum: 0 },
          subresource: { type: "object", additionalProperties: true },
          records: recordsSchema,
          image: readImageSchema
        },
        additionalProperties: false
      }
    }
  },
  required: ["artifact", "reads"],
  additionalProperties: false
};
var RHI_DEBUG_OPERATION_MANIFEST = {
  schemaVersion: "1.0.0",
  artifactRefSchema,
  operations: [
    {
      name: "rhi.capture",
      summary: "Capture the next frame and return one rhi-tape ArtifactRef.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      },
      outputSchema: artifactRefSchema,
      recoveryCodes: [
        "capture-unavailable",
        "capture-busy",
        "capture-snapshot-failed",
        "capture-timeout"
      ]
    },
    {
      name: "rhi.summary",
      summary: "List work indices, pipeline entry points, and missing initial contents from one tape.",
      inputSchema: {
        type: "object",
        properties: { artifact: artifactRefSchema },
        required: ["artifact"],
        additionalProperties: false
      },
      outputSchema: summaryOutputSchema,
      recoveryCodes: ["tape-invalid", "tape-version-unsupported"]
    },
    {
      name: "rhi.inspect",
      summary: "Replay one ArtifactRef and inspect a workIndex: pipeline, bindings with access, pixels, and every color/depth/storage output it wrote; optionally decode bounded buffer records.",
      inputSchema: RHI_INSPECT_INPUT_SCHEMA,
      outputSchema: inspectOutputSchema,
      recoveryCodes: [
        "tape-invalid",
        "tape-version-unsupported",
        "replay-capability-mismatch",
        "replay-event-failed",
        "replay-position-invalid",
        "readback-failed",
        "readback-unsupported"
      ]
    },
    {
      name: "rhi.read",
      summary: "Replay one ArtifactRef once and read up to 64 resources, bindings or named work outputs at work indices as bytes, typed records, image stats, linearized depth, atlas tiles and PNGs.",
      inputSchema: RHI_READ_INPUT_SCHEMA,
      outputSchema: {
        type: "object",
        properties: {
          artifact: artifactRefSchema,
          reads: { type: "array", items: { type: "object", additionalProperties: true } }
        },
        required: ["artifact", "reads"],
        additionalProperties: false
      },
      recoveryCodes: [
        "tape-invalid",
        "tape-version-unsupported",
        "replay-capability-mismatch",
        "replay-event-failed",
        "replay-position-invalid",
        "readback-failed",
        "readback-unsupported",
        "read-request-invalid",
        "artifact-write-failed"
      ]
    },
    {
      name: "rhi.timing",
      summary: "Replay one ArtifactRef once with replay-owned timestamps and report GPU nanoseconds per pass.",
      inputSchema: {
        type: "object",
        properties: { artifact: artifactRefSchema },
        required: ["artifact"],
        additionalProperties: false
      },
      outputSchema: {
        type: "object",
        properties: {
          artifact: artifactRefSchema,
          timing: { type: "object", additionalProperties: true }
        },
        required: ["artifact", "timing"],
        additionalProperties: false
      },
      recoveryCodes: [
        "tape-invalid",
        "tape-version-unsupported",
        "replay-capability-mismatch",
        "replay-event-failed",
        "readback-failed"
      ]
    }
  ]
};
function discoverRhiDebugOperations() {
  return RHI_DEBUG_OPERATION_MANIFEST.operations;
}
function renderRhiDebugHelp() {
  return [
    "forgeax rhi <capture|summary|inspect|read|timing>",
    ...discoverRhiDebugOperations().map((operation) => `  ${operation.name}: ${operation.summary}`),
    "Usage:",
    "  forgeax rhi summary --artifact PATH --json",
    `  forgeax rhi inspect --artifact PATH --work-index N --fields '["pipeline","bindings","outputs"]' --json`,
    `  forgeax rhi read --artifact PATH --reads '[{"binding":{"group":0,"binding":2},"workIndex":N,"image":{"format":"rgba16float","width":W,"height":H,"tile":{"tileWidth":8,"tileHeight":8,"index":0},"png":"probe.png"}}]' --json`,
    `  forgeax rhi read --artifact PATH --reads '[{"output":"depth","workIndex":N,"image":{"depth":{"near":0.1,"far":100,"reverseZ":true},"range":"auto","png":"shadow.png"}}]' --json`,
    `  forgeax rhi read --artifact PATH --reads '[{"binding":{"group":0,"binding":3},"workIndex":N,"records":{"layout":{"stride":16,"fields":[{"name":"radiance","offset":0,"type":"f32","components":4}]},"first":0,"count":64}}]' --json`,
    "  forgeax rhi timing --artifact PATH --json",
    "Records decode rows [first, first+count) of stride bytes inside the selected buffer window (binding range or subresource {offset,size}); a mappable staging buffer returns readback-unsupported, so read the buffer it was copied from.",
    "Replay uses Dawn; a tape that builds acceleration structures needs FORGEAX_WEBGPU_NODE=wgpu-native from a contributor checkout with @forgeax/engine-rhi-wgpu-native built (otherwise replay-backend-unavailable).",
    "Read requests: one of resourceId, binding or output (binding/output need workIndex); records {layout,first,count}; image {format,width,height,offset,bytesPerRow,tile,depth,exposure,range,tonemap,png}.",
    "Optional --digest verifies the file against an expected sha256 digest.",
    "Inspect fields: pipeline, bindings, pixels, outputs. Use summary.works[].workIndex.",
    "Outputs name what a work wrote: colorN, depth, @group(G)@binding(B) (writable storage); pixels fall back to depth or a storage texture.",
    "ArtifactRef schema:",
    JSON.stringify(RHI_DEBUG_OPERATION_MANIFEST.artifactRefSchema)
  ].join("\n");
}
function recoverRhiDebugError(error) {
  switch (error.code) {
    case "capture-unavailable":
    case "capture-busy":
    case "capture-snapshot-failed":
    case "capture-timeout":
      return `${error.hint}: ${error.detail?.cause ?? "capture failed"}`;
    case "tape-invalid":
      return `${error.hint}: ${error.detail?.cause ?? "tape validation failed"}`;
    case "tape-version-unsupported":
      return `${error.hint}: found ${error.detail?.foundVersion}, expected ${error.detail?.expectedVersion}`;
    case "replay-capability-mismatch":
      return `${error.hint}: ${error.detail?.cause ?? "capability mismatch"}`;
    case "replay-event-failed":
      return `${error.hint}: event ${error.detail?.eventIndex} ${error.detail?.kind} at ${error.detail?.stage}`;
    case "replay-position-invalid":
      return `${error.hint}: requested ${error.detail?.requested}, available ${error.detail?.available}`;
    case "readback-failed":
      return `${error.hint}: ${error.detail?.cause ?? "readback failed"}`;
    case "readback-unsupported":
      return `${error.hint}: ${error.detail?.reason ?? "readback is unsupported"}`;
  }
}
function coreError(error) {
  return {
    code: error.code,
    expected: error.expected,
    hint: recoverRhiDebugError(error),
    detail: error.detail === void 0 ? {} : Object.fromEntries(Object.entries(error.detail))
  };
}
function operationError(code, expected, hint, detail = {}) {
  return { ok: false, error: { code, expected, hint, detail } };
}
function validateArtifactRef(value) {
  if (value === null || typeof value !== "object") {
    return operationError(
      "artifact-ref-invalid",
      "an ArtifactRef object",
      "Pass the ArtifactRef returned by rhi.capture unchanged."
    );
  }
  const candidate = value;
  if (candidate.kind !== RHI_TAPE_ARTIFACT_KIND) {
    return operationError(
      "artifact-kind-invalid",
      `ArtifactRef.kind to equal ${RHI_TAPE_ARTIFACT_KIND}`,
      "Capture a new RHI tape and pass its ArtifactRef unchanged.",
      { kind: candidate.kind ?? null }
    );
  }
  if (typeof candidate.digest !== "string" || candidate.digest.length === 0) {
    return operationError(
      "artifact-digest-invalid",
      "ArtifactRef.digest to be a non-empty digest",
      "Use the digest returned with the captured tape."
    );
  }
  if (typeof candidate.source !== "string" || candidate.source.length === 0) {
    return operationError(
      "artifact-source-invalid",
      "ArtifactRef.source to identify the producing operation",
      "Use the complete ArtifactRef returned by rhi.capture."
    );
  }
  return {
    ok: true,
    value: {
      kind: RHI_TAPE_ARTIFACT_KIND,
      digest: candidate.digest,
      source: candidate.source,
      ...typeof candidate.path === "string" ? { path: candidate.path } : {}
    }
  };
}
async function readTape(artifact, context) {
  const validated = validateArtifactRef(artifact);
  if (!validated.ok) return validated;
  const bytes = await context.readArtifact(validated.value);
  if (!bytes.ok) return bytes;
  const actual = tapeDigest(bytes.value);
  if (actual !== validated.value.digest) {
    return operationError(
      "artifact-digest-mismatch",
      "the file bytes to match ArtifactRef.digest",
      "Use the original captured file or open this file by path to obtain its current digest.",
      { expected: validated.value.digest, actual, path: validated.value.path ?? null }
    );
  }
  return bytes;
}
async function runRhiDebugOperation(name, input, context) {
  switch (name) {
    case "rhi.capture": {
      const capture = await context.captureFrame(input);
      if (!capture.ok) return { ok: false, error: coreError(capture.error) };
      const artifact = validateArtifactRef(capture.value);
      if (!artifact.ok) return artifact;
      return { ok: true, value: artifact.value };
    }
    case "rhi.summary": {
      const summaryInput = input;
      const bytes = await readTape(summaryInput.artifact, context);
      if (!bytes.ok) return bytes;
      const decoded = decodeTape(bytes.value);
      if (!decoded.ok) return { ok: false, error: coreError(decoded.error) };
      const artifact = validateArtifactRef(summaryInput.artifact);
      if (!artifact.ok) return artifact;
      return {
        ok: true,
        value: {
          artifact: artifact.value,
          summary: summarizeFrame(buildFrameModel(decoded.value))
        }
      };
    }
    case "rhi.inspect": {
      const inspectInput = input;
      if (!Number.isInteger(inspectInput.workIndex) || inspectInput.workIndex < 0) {
        return operationError(
          "work-index-invalid",
          "workIndex to be a non-negative integer",
          "Choose workIndex from the work inventory returned by rhi.summary.",
          { workIndex: inspectInput.workIndex }
        );
      }
      const opened = await openTapeReplay(inspectInput.artifact, context, name);
      if (!opened.ok) return opened;
      try {
        const inspection = await opened.value.session.inspectWork(
          inspectInput.workIndex,
          inspectInput.fields ?? ["pipeline", "bindings"]
        );
        if (!inspection.ok) return { ok: false, error: coreError(inspection.error) };
        const artifact = validateArtifactRef(inspectInput.artifact);
        if (!artifact.ok) return artifact;
        const buffer = inspectInput.buffer;
        const records = buffer === void 0 ? void 0 : await inspectBufferRecords(
          opened.value.session,
          buffer.resourceId,
          inspectInput.workIndex,
          buffer.layout,
          { first: buffer.first, count: buffer.count }
        );
        if (records !== void 0 && !records.ok)
          return { ok: false, error: coreError(records.error) };
        const { outputs, ...rest } = inspection.value;
        const projected = outputs === void 0 ? rest : {
          ...rest,
          outputs: await Promise.all(
            outputs.map(
              async ({ result, ...output }) => ({
                ...output,
                read: result.ok ? await projectRead(result.value, {}, context) : { ok: false, error: coreError(result.error) }
              })
            )
          )
        };
        return {
          ok: true,
          value: {
            artifact: artifact.value,
            inspection: projected,
            ...records?.ok === true ? { bufferRecords: records.value } : {}
          }
        };
      } finally {
        await opened.value.close();
      }
    }
    case "rhi.read":
      return runRead(input, context);
    case "rhi.timing": {
      const { artifact: ref } = input;
      const artifact = validateArtifactRef(ref);
      if (!artifact.ok) return artifact;
      const opened = await openTapeReplay(ref, context, name);
      if (!opened.ok) return opened;
      try {
        const timing = await opened.value.session.timePasses();
        if (!timing.ok) return { ok: false, error: coreError(timing.error) };
        return { ok: true, value: { artifact: artifact.value, timing: timing.value } };
      } finally {
        await opened.value.close();
      }
    }
  }
}
async function openTapeReplay(artifact, context, operation) {
  const bytes = await readTape(artifact, context);
  if (!bytes.ok) return bytes;
  const decoded = decodeTape(bytes.value);
  if (!decoded.ok) return { ok: false, error: coreError(decoded.error) };
  if (context.createReplayBackend === void 0) {
    return operationError(
      "replay-backend-unavailable",
      "a fresh ReplayBackend factory",
      `Provide a fresh device and shader factory before running ${operation}.`
    );
  }
  const backend = await context.createReplayBackend(decoded.value);
  if (!backend.ok) return backend;
  const opened = await openReplay(decoded.value, backend.value);
  if (!opened.ok) {
    backend.value.release();
    return { ok: false, error: coreError(opened.error) };
  }
  const session = opened.value;
  const close = async () => {
    try {
      await session.dispose();
    } finally {
      backend.value.release();
    }
  };
  return { ok: true, value: { tape: decoded.value, session, close } };
}
async function runRead(input, context) {
  if (!Array.isArray(input.reads) || input.reads.length < 1 || input.reads.length > RHI_READ_LIMIT)
    return operationError(
      "read-request-invalid",
      `reads to hold 1..${RHI_READ_LIMIT} requests`,
      "Split large read sets into several rhi.read calls.",
      { count: Array.isArray(input.reads) ? input.reads.length : null }
    );
  const artifact = validateArtifactRef(input.artifact);
  if (!artifact.ok) return artifact;
  const opened = await openTapeReplay(input.artifact, context, "rhi.read");
  if (!opened.ok) return opened;
  const { tape, session, close } = opened.value;
  try {
    const needsBindings = input.reads.some(
      (read) => read.binding !== void 0 || read.output !== void 0
    );
    const works = needsBindings ? buildFrameModel(tape).works : [];
    const reads = new Array(input.reads.length);
    const batch = [];
    const slots = [];
    input.reads.forEach((read, slot) => {
      const request = readRequest(read, works);
      if (!request.ok) reads[slot] = request;
      else {
        batch.push(request.value);
        slots.push(slot);
      }
    });
    if (batch.length > 0) {
      const results = await session.readAtWorks(batch);
      if (!results.ok) return { ok: false, error: coreError(results.error) };
      for (const [index, slot] of slots.entries()) {
        const read = results.value[index];
        const request = input.reads[slot];
        reads[slot] = read === void 0 || !read.ok ? {
          ok: false,
          error: read === void 0 ? readInvalid("missing result") : coreError(read.error)
        } : await projectRead(read.value, request, context);
      }
    }
    return { ok: true, value: { artifact: artifact.value, reads } };
  } finally {
    await close();
  }
}
function readRequest(read, works) {
  const selectors = [read.resourceId, read.binding, read.output].filter((v) => v !== void 0);
  if (selectors.length !== 1)
    return { ok: false, error: readInvalid("name exactly one of resourceId, binding or output") };
  if (read.output !== void 0) {
    const work = read.workIndex === void 0 ? void 0 : works[read.workIndex];
    if (work === void 0)
      return {
        ok: false,
        error: readInvalid("an output read needs a workIndex from rhi.summary.works")
      };
    const outputs = workOutputs(work);
    const output = outputs.find((candidate) => candidate.name === read.output);
    if (output === void 0)
      return {
        ok: false,
        error: readInvalid(
          `work ${work.workIndex} has no output ${read.output}; it wrote ${outputs.map((candidate) => candidate.name).join(", ") || "nothing"}`
        )
      };
    return recordWindow(read, output.request);
  }
  if (read.binding !== void 0) {
    const work = read.workIndex === void 0 ? void 0 : works[read.workIndex];
    if (work === void 0)
      return {
        ok: false,
        error: readInvalid("a binding read needs a workIndex from rhi.summary.works")
      };
    const request = bindingReadRequest(work, read.binding.group, read.binding.binding);
    if (!request.ok) return { ok: false, error: coreError(request.error) };
    return recordWindow(read, request.value);
  }
  return recordWindow(read, {
    resourceId: read.resourceId,
    ...read.workIndex === void 0 ? {} : { workIndex: read.workIndex }
  });
}
function recordWindow(read, selected) {
  const request = read.subresource === void 0 ? selected : { ...selected, subresource: read.subresource };
  if (read.records === void 0) return { ok: true, value: request };
  const selectedWindow = request.subresource;
  if (selectedWindow !== void 0 && !("offset" in selectedWindow))
    return {
      ok: false,
      error: readInvalid("records decode buffer bytes; a texture subresource has no record rows")
    };
  const window = selectedWindow;
  const base = window?.offset ?? 0;
  const { first, count } = read.records;
  const stride = read.records.layout.stride;
  const offset = base + stride * first;
  const size = stride * count;
  if (window?.size !== void 0 && stride * (first + count) > window.size)
    return {
      ok: false,
      error: readInvalid(
        `records ${first}..${first + count - 1} (stride ${stride}) exceed the ${window.size}-byte window at offset ${base}`
      )
    };
  return { ok: true, value: { ...request, subresource: { offset, size } } };
}
async function projectRead(read, request, context) {
  let records;
  if (request.records !== void 0) {
    const decoded = decodeBufferRecords(read, request.records.layout, request.records);
    if (!decoded.ok) return { ok: false, error: coreError(decoded.error) };
    records = decoded.value.records;
  }
  let image;
  if (request.image !== void 0) {
    const { tile, png, exposure, range, tonemap, depth, ...layout } = request.image;
    if (typeof range === "string" && range !== "auto")
      return {
        ok: false,
        error: readInvalid(`image.range ${range} is neither [min, max] nor 'auto'`)
      };
    const decoded = readbackImage(read, layout);
    if (!decoded.ok) return { ok: false, error: coreError(decoded.error) };
    const texels = depth === void 0 ? decoded.value : depthImage(decoded.value, depth === true ? void 0 : depth);
    const cropped = tile === void 0 ? ok(texels) : extractTile(texels, tile);
    if (!cropped.ok) return { ok: false, error: coreError(cropped.error) };
    const { width, height } = cropped.value;
    let written;
    if (png !== void 0) {
      if (context.writeFile === void 0)
        return operationError(
          "artifact-write-failed",
          "a host that can write PNG previews",
          "Run rhi.read through the forgeax CLI, or omit image.png."
        );
      const display = {
        ...exposure === void 0 ? {} : { exposure },
        ...range === void 0 ? {} : { range },
        ...tonemap === void 0 ? {} : { tonemap }
      };
      const saved = await context.writeFile(
        png,
        encodePng(width, height, toRgba8(cropped.value, display))
      );
      if (!saved.ok) return saved;
      written = saved.value;
    }
    image = {
      width,
      height,
      stats: imageStats(cropped.value),
      ...written === void 0 ? {} : { png: written }
    };
  }
  return {
    ok: true,
    value: {
      resourceId: read.resourceId,
      provenance: read.provenance,
      byteLength: read.bytes.byteLength,
      digest: tapeDigest(read.bytes),
      ...records === void 0 ? {} : { records },
      ...image === void 0 ? {} : { image }
    }
  };
}
function readInvalid(cause) {
  return {
    code: "read-request-invalid",
    expected: "a read naming a resourceId, or a binding or output together with its workIndex",
    hint: cause,
    detail: {}
  };
}

export { RHI_DEBUG_OPERATION_MANIFEST, RHI_INSPECT_INPUT_SCHEMA, RHI_READ_INPUT_SCHEMA, createRhiDebugOperationContext, discoverRhiDebugOperations, recoverRhiDebugError, renderRhiDebugHelp, runRhiDebugOperation };
//# sourceMappingURL=chunk-DVDZY2BO.mjs.map
//# sourceMappingURL=chunk-DVDZY2BO.mjs.map