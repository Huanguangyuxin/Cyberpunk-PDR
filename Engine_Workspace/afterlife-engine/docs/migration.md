# Afterlife Engine migration

Template Disposition
- Runtime/controller code: REPLACE — retain the existing Afterlife first-person controller.
- Player character and animation: REPLACE — first-person collision capsule; no starter scout.
- Scene entities and composition: REPLACE — existing Blender interior and side rooms.
- Meshes and materials: REPLACE — imported Afterlife GLB and neon materials.
- Lighting and environment: REPLACE — existing 32 lights, 7 fog zones and 17 circuits.
- UI and copy: REPLACE — existing English in-world signage; starter guide removed.
- Template tests: REMOVE — retained as an external reference; existing Afterlife tests copied.
- Residual template identifiers allowed at delivery: none.

Pinned release: Engine / View / SDK 0.4.18, stable latest resolved on 2026-10-27.
Engine source commit: 30ae88226564ca90ae6082f7e94686a4cc781a6a.
SDK installed and initialized through the official npm CLI; pnpm 12.10.1 / Node 22.22.3.
The previous Studio project is preserved unchanged as the rollback source.

## Deferred visual work
Material texture/detail, roughness variation, wet reflections and post-processing refinement are the next visual optimization targets. This migration retains the current art direction.
