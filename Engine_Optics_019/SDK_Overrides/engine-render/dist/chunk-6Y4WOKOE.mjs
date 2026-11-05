// sdk/engine/node_modules/@forgeax/engine-render/src/temporal/coverage.ts
function createTemporalCoverage(width, height) {
  if (!Number.isSafeInteger(width) || width <= 0) throw new RangeError("width must be positive.");
  if (!Number.isSafeInteger(height) || height <= 0)
    throw new RangeError("height must be positive.");
  return Object.freeze({ width, height, bytes: 34 * width * height, fullScreen: true });
}
function classifySceneDataCoverage(input) {
  const exactContributorIds = input.contributors.filter((c) => c.kind === "exact").map((c) => c.id);
  const reactiveContributorIds = input.contributors.filter((c) => c.kind === "reactive").map((c) => c.id);
  const available = new Set(input.contributors.map((c) => c.id));
  const missing = input.requiredContributorIds.filter((id) => !available.has(id));
  return {
    exactContributorIds: Object.freeze(exactContributorIds),
    reactiveContributorIds: Object.freeze(reactiveContributorIds),
    missingContributorIds: Object.freeze(missing.slice(0, 32)),
    omittedMissingContributorCount: Math.max(0, missing.length - 32),
    complete: missing.length === 0
  };
}
function scanSceneDataCoverage(input) {
  const classification = classifySceneDataCoverage({
    contributors: input.contributorIds.map((id) => ({ id, kind: "exact" })),
    requiredContributorIds: input.requiredContributorIds
  });
  return Object.freeze({
    schema: input.schema,
    lane: input.lane,
    producerId: input.producerId,
    ...classification,
    contributorIds: Object.freeze([...input.contributorIds])
  });
}

export {
  createTemporalCoverage,
  classifySceneDataCoverage,
  scanSceneDataCoverage
};
//# sourceMappingURL=chunk-6Y4WOKOE.mjs.map
