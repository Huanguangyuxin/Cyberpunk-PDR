#!/usr/bin/env node
import { validatePreviewArtifactManifest } from '@forgeax/engine-preview';
import { validateArtifactManifest } from '@forgeax/engine-tool-runtime';

function analyzePreviewArtifacts(request) {
  const required = request.required ?? [];
  const validated = request.manifest.schemaVersion === "1.0.0" ? required.some((kind) => kind !== "rhi-tape" && kind !== "png" && kind !== "profile-capture") ? {
    ok: false,
    error: {
      code: "tool-artifact-manifest-invalid",
      expected: "requested evidence kinds to belong to the v1 artifact manifest",
      hint: "Request one of rhi-tape, png, or profile-capture for a v1 manifest.",
      detail: { reason: "unsupported required evidence kind" }
    }
  } : validateArtifactManifest(request.manifest, required) : validatePreviewArtifactManifest(
    request.manifest,
    (request.required ?? []).filter(
      (role) => role === "report" || role === "rhi-tape" || role === "capture" || role === "fresh-replay" || role === "profile-capture" || role === "contact-sheet"
    )
  );
  if (!validated.ok) return { ok: false, error: validated.error };
  return {
    ok: true,
    value: {
      runId: request.manifest.identity.runId,
      captureId: request.manifest.identity.captureId,
      artifacts: request.manifest.artifacts.map(({ kind, digest }) => ({ kind, digest }))
    }
  };
}

export { analyzePreviewArtifacts };
//# sourceMappingURL=offline-analysis-DSQKDYV3.mjs.map
//# sourceMappingURL=offline-analysis-DSQKDYV3.mjs.map