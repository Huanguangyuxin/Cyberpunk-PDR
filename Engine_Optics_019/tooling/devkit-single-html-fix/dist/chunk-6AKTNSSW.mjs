#!/usr/bin/env node
// src/animation-playback.ts
var animationPlaybackSchema = {
  type: "object",
  additionalProperties: false,
  properties: { cadence: { enum: ["update", "fixed"] } }
};
function animationPlayback(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.entries(value).some(
    ([key, cadence2]) => key !== "cadence" || cadence2 !== void 0 && cadence2 !== "update" && cadence2 !== "fixed"
  ))
    throw new Error("animation requires an object with cadence: update or fixed");
  const { cadence } = value;
  return cadence === void 0 ? {} : { cadence };
}
function environmentAnimationPlayback() {
  const value = process.env.FORGEAX_ANIMATION_PLAYBACK;
  return value === void 0 ? {} : animationPlayback(JSON.parse(value));
}

export { animationPlayback, animationPlaybackSchema, environmentAnimationPlayback };
//# sourceMappingURL=chunk-6AKTNSSW.mjs.map
//# sourceMappingURL=chunk-6AKTNSSW.mjs.map