// sdk/engine/node_modules/@forgeax/engine-render/src/features/fullscreen.ts
import { ok } from "@forgeax/engine-types";
var declarationKey = /* @__PURE__ */ Symbol.for("forgeax.render.fullscreen-declaration");
function fullscreenRenderFeatureDeclaration(feature) {
  return feature[declarationKey];
}
function createFullscreenRenderFeature(options) {
  const resourceName = `fullscreen.${options.identity.replace(/[^a-z0-9.-]/gi, "-").toLowerCase()}`;
  const declaration = Object.freeze({
    identity: options.identity,
    source: options.source,
    ...options.stage === void 0 ? {} : { stage: options.stage },
    ...options.reads === void 0 ? {} : {
      reads: Object.freeze(
        options.reads.map(
          (read) => typeof read === "string" ? read : Object.freeze({ ...read })
        )
      )
    },
    ...options.params === void 0 ? {} : {
      params: Object.freeze({
        byteSize: options.params.byteSize,
        defaultValue: options.params.defaultValue.slice()
      })
    }
  });
  const feature = {
    identity: options.identity,
    requiredFullscreenPostProcesses: Object.freeze([
      Object.freeze({ identity: options.identity, source: options.source })
    ]),
    extract: (context) => ok(options.enabled?.(context)),
    plan: (enabled, _context) => ok(
      enabled === false ? { work: [] } : {
        work: [
          {
            scope: "frame",
            resources: [
              {
                kind: "fullscreen-program",
                name: resourceName,
                source: options.source,
                ...declaration.stage === void 0 ? {} : { stage: declaration.stage },
                ...declaration.reads === void 0 ? {} : { reads: declaration.reads },
                ...declaration.params === void 0 ? {} : { params: declaration.params }
              }
            ],
            passes: []
          }
        ]
      }
    )
  };
  Object.defineProperty(feature, declarationKey, { value: declaration });
  return Object.freeze(feature);
}

export {
  fullscreenRenderFeatureDeclaration,
  createFullscreenRenderFeature
};
//# sourceMappingURL=chunk-XZHQWBNV.mjs.map
