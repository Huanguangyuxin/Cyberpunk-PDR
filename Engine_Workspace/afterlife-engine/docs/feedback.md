# Game feedback

## 2026-10-27 — SDK launcher and pnpm 12
- Scope: local bootstrap tooling.
- Reproduction: SDK 0.4.18 launcher through Corepack 0.33.0 and 0.36.0 with pnpm 12.10.1.
- Expected: resolve the installed pnpm entry.
- Actual: Corepack attempted a missing bin/pnpm.cjs, while this pnpm release uses bin/pnpm.mjs.
- Evidence: /tmp/afterlife-sdk-init.log (first failure recorded during setup).
- Status: recovered using the SDK-supported direct pnpm invocation in an isolated toolchain PATH. No SDK files changed.


## 2026-10-27 — Lizzie V3 import and local playback

- Scope: pinned Engine/View/SDK 0.4.18; native glTF import, scene Pack, first-person Rapier controller, local fog and emissive circuits.
- Reproduction: build the current project, run the standalone browser preview, click the scene, move with WASD and ascend the right staircase.
- Expected/actual: V3 stage, water ribbon and usable two-storey layout load; actual native Chrome interaction reached the upper lounge. Pointer lock was observed true after a trusted click. Keyboard turning and walking were observed. Automated mouse dragging did not establish a mouse-look observation, so mouse-look visual behavior is not independently qualified by that action.
- Evidence: `artifacts/lizzie-v3/initial.png`, `artifacts/lizzie-v3/runtime` and `runtime.json`; dev verify revision `fd4b83d9-f2f8-45d9-9ab4-522ff7f364f2` passed with zero console/page errors in its hardware Chrome execution. That diagnostic dev execution was subsequently stopped. The delivered static preview at http://localhost:5173/ was separately tested in the user's Chrome tab, including traversal and refresh.
- Observed limits: roughly 18–27 FPS during traversal, depending on view and fog/light coverage. No measured optimization target was requested or qualified. Some upper room partitions/guardrails/small props are visual-only and need future collision refinement. Blender Cycles appearance is not identical to Engine tone mapping, punctual lighting and fog.
- Status: imported and locally playable; visual/performance/collision refinement remains. No Engine upgrade, Studio dependency or public deployment.

- Refresh follow-up: the delivered static Chrome tab reloaded and moved again with W; final page kept open in front.
- SDK guide discrepancy: the guide example `asset add` is absent from the pinned 0.4.18 command tree (`tool-command-not-found`); discovered and used `asset import --path` successfully. No runtime workaround was added.

2026-10-28 V4 import: gltf-accessor-type-mismatch at accessor 81 (23,512,856 vertices after stool subdivision). Runtime derivative now removes subdivision modifiers before export; user source untouched. Evidence: Cyberpunk/WorkBuddy_V4_Import_export.log.

2026-10-28 V4 startup: explicit standard-light-budget-exceeded (74 > 32) in pinned Engine Standard profile. Runtime derivative consolidates illumination to 30 authored local lights while preserving all emissive fixtures. Initial failure: /tmp/v4-start.json. User source unchanged.

## 2026-10-28 — WorkBuddy V4 local delivery

- Recovered import and startup: final derivative is 31 material batches, six baked maps and 30 local lights. Existing native FPS, atmosphere and neon owners retained. Original V4/V3 untouched.
- Engine 0.4.18 hardware Chrome dev verify passed at revision dde8d1fa-dcef-49d5-8245-26c46cd60da0, zero console/page errors; screenshot viewed. Evidence: artifacts/workbuddy-v4/dev-verify.json and runtime.png. Diagnostic execution then stopped.
- Delivered dist separately observed in user Chrome at http://localhost:5173/: walking and keyboard turning, trusted-click pointer lock true, 33-tread staircase ascent to +5.6 m upper lounge, then refresh and walking again. Screenshots: upper-lounge.png and playable.png. Browser tab retained. Approx. 28–42 FPS observed after diagnostic execution stopped, not a performance benchmark.
- Limits: Blender-to-Engine appearance differs, especially bloom, fog and light falloff; no claim of pixel matching. Water is a static imported surface. Small stools/foliage are visual-only. Mouse lock was observed; automated input did not independently qualify physical mouse-look behavior.
- Checks: 11 tests, typecheck, project check, asset verify and final production build passed. No public deployment or Engine upgrade.

2026-10-28 V5 static-preview reload: asset-dependency-failed for mesh 01a18078-9d28-7efe-9848-e2e68131dbd4. On existing preview process 75658, served body was 491964 bytes / sha256 ed2e07d25a2bfd2c5f31a4f990c694c95506cfdfbc74a7d2eb9d6bc4a312fad7, while current dist and manifest expected 735324 bytes / sha256 ae0e677153153451ca7f13080530fa83323cad9c1fc9e4a911051a33bd34a183. Restarted the confirmed project preview process after build; checking same URL again. Indicates stale served binary across in-place dist rebuild; no source asset deletion or Engine upgrade.

## 2026-10-28 — V5 grade, furniture and jump

- Scope: Camera output grade, local fog, emissive strength, V5 furniture, Space jump. Engine stays 0.4.18; no Studio, upgrade or publication.
- Exposure uses the real Camera columns (`exposureMode` 0 = manual, `exposure` multiplier) with Reinhard-extended tonemap. Grade lives in `assets/atmosphere/grade.ts`: exposure 1 → 0.68, bloomIntensity .24 → .11, bloomThreshold .9 → 1.6, bloomSmoothWidth .01 → .4, bloomRadius .62 → .22. The first-person plugin no longer sets its own bloomIntensity.
- Fog extinction Stage .022 → .0075, Dance .016 → .0055, Bar .009 → .0026, Upper .012 → .0038; albedo .88–.96 → .62–.74; emission reduced ~3×. Neon circuit gain 4 → 2.4; exported GLB emissive strength ×0.55 (neon 12 → 6.6).
- V5 source: `cyberpunk_bar_v5.blend` from untouched V4 (SHA-256 d65b6a24…) via `make_cyberpunk_bar_v5.py`. Export adapter reads V5; GLB sidecar unchanged; 30 lights, 6 baked maps, 31 batches, 562,765 vertices, 215 colliders.
- Checks: 21 tests, typecheck, project check, asset verify, production build passed. Fresh hardware headless `dev verify` revision 64e8a1ed-8e7d-40ee-bbc0-75d29576d5ca returned `verified: runtime`, zero console/page errors (artifacts/v5-tuning/dev-verify.png). A stale unreachable dev owner (live-configuration-conflict) was stopped first.
- Pending: user Chrome acceptance of appearance, jump feel and stair traversal on http://localhost:5173/.

2026-10-28 V5 delivered Chrome QA: restarted project preview now serves mesh body with matching 735324-byte length and manifest digest; static startup recovered. Observed reduced washout and visible floor joints/props, Space jump/landing/re-press, hold Space without automatic repeat, refresh and movement/jump, full ascent to upper lounge. Screenshots and exact observations: artifacts/v5-tuning/manual-qa.json, playable-ground.png, jump-air.png, upper-lounge-qa.png. Stair side rails are visual-only and walking off the narrow tread edge drops to ground; this was not changed by the requested furniture pass. Native dev verify passed; its diagnostic browser was stopped after verification.

## 2026-10-28 — V6 seating layout and field of view

- V6 authored in WorkBuddy against the supplied spatial-design board: 12 mixed social tables, three large front booths, grouped bar stools, reduced upper seating. Source V4/V5 unchanged. Runtime asset identity retained.
- Corrected Camera.fov interpretation: it is vertical. Previous 84-degree vertical lens made furniture appear smaller; lens.ts keeps 84 degrees horizontally with actual aspect conversion. Capsule/eye height unchanged.
- WorkBuddy native startup was blocked by its brokered file policy during DDC head overwrite (commit-failed/source-package-ddc-failed). Narrow generated-cache permissions were approved in its UI, but a subsequent session remained starting without bridge. After stopping that task and its stale owner, the independent local CLI started hardware Chrome and dev verify passed, zero console/page errors, revision 6e7ebe1a-7507-41ae-b043-a5a48b8ee862. Evidence: artifacts/v6-layout/dev-start-qa.json, dev-verify-qa.json and runtime-qa.png. Earlier failed WorkBuddy reports remain alongside for traceability. No Engine or SDK source was changed.
- Project preview was restarted against final dist to avoid the previously observed stale body cache. User Chrome separately loaded and walked the updated layout, inspected adult-scale table/chair relationships and traversed social seating to the dance-floor edge. Screenshot: social-qa.png. Diagnostic private browser then stopped. This is functional/visual acceptance, not a performance benchmark.

V6 final static reload follow-up: user Chrome refreshed successfully, walked back into the new social seating and Space jump remained functional. Final screenshot: artifacts/v6-layout/social-final.png. Manual observations: manual-qa.json.

## 2026-10-28 — V6 layout / V7 furniture mass and scale calibration

- V6 (`make_cyberpunk_bar_v6.py` → `cyberpunk_bar_v6.blend`): board-based layout, 12 social tables, 3 booth islands, 27 grouped bar stools, 3 lounge groups. V7 (`make_cyberpunk_bar_v7.py` → `cyberpunk_bar_v7.blend`) keeps V6 counts/positions and rebuilds every piece heavier (four-top 1.70 × 0.95 × 0.75 m, chair 0.56 × 0.54, seat 0.47, overall 1.06 m; booth table 2.8 × 1.2 m; sofa 2.6 m). Export adapter reads V7 and strips `15_Calibration`.
- Lens finding: Camera.fov is vertical; V4–V5 used 84° vertical ≈ 116° horizontal at 16:9. `assets/player/lens.ts` now keeps 84° horizontal (≈ 53.7° vertical). GLB check: 61 root nodes, no hierarchy, all unit scale except Plant_Leaf Y 1.25.
- Runtime calibration (off by default): KeyC toggles 1 m ruler + 1.75 m adult at R4a; Digit1/Digit2 stand 1 m / 2 m from its near edge under normal gravity; read `afterlife.calibration` reports live fov, aspect, eye height and world scale. Runtime values are not yet measured.
- Checks: 43 tests, typecheck, asset verify, build passed; sidecar unchanged; 30 lights, 6 maps, 31 batches. Native `dev verify` blocked earlier by a DDC rename refused by the WorkBuddy file policy (`commit-failed`); user runs native verification and Chrome acceptance.

## 2026-10-28 — V7 actual first-person scale and aspect correction

- WorkBuddy rebuilt furniture volume against an adult-scale reference, preserving V6 counts and main layout. Calibrator supplies 1/2 m player presets, ruler and adult; hidden by default. Initial adult placement was outside the camera view; moved to the far-right side and tested for visibility and capsule clearance before runtime acceptance.
- Actual native measurement initially found autoAspect false, Camera.aspect fixed 1.77777779 while the canvas was non-16:9. Unit X/Z world scale was already about one and eye height about 1.60 m. This camera configuration compressed the image horizontally; enabled autoAspect and real drawing-buffer aspect without changing the target horizontal lens.
- Final measurement: autoAspect true; Camera.aspect 1.362608075 vs drawingBufferAspect 1.362608117; horizontal FOV 83.999996 degrees; eye 1.5999996 m above floor; 31 imported mesh batches at X/Z scales about 1. Evidence: artifacts/v7-scale/runtime-scale-final.json.
- WorkBuddy's final build was blocked on a cumulative 1465-item deletion confirmation with insufficient per-item scope. That cleanup was canceled; source edits were retained. Standard project CLI build from the confirmed game root succeeded independently (build-final-qa.json). No global permission or security configuration was changed.
- Final hardware dev verify: dbcb9aa3-341b-452d-b077-403ca4658ce1, zero console/page errors, screenshot runtime-final.png viewed. Diagnostic browser stopped afterward. Final dist preview restarted at localhost:5173; actual user Chrome reload, 1/2 m calibration views, reference toggle-off, walking and Space jump observed. Screenshots first-person-1m-final.png, first-person-2m-final.png and first-person-clean-final.png. Normal view kept open. This is scale/functional verification, not photoreal-material or performance acceptance.


## 2026-10-28 — Historical runtime probe: complete Renderer inspection is not CLI-serializable

- Scope: installed Engine/SDK0.4.18, existing afterlife-engine/WorkBuddy V7 historical scene, hardware headless WebGPU with Engine/Render Workers. This is interface evidence, not new PDR or art acceptance.
- Reproduction: from this game root and the pinned local toolchain, start an owned dev session, read its actual revision, then run `pnpm exec forgeax dev eval --revision <current-revision> --code 'return await execution.inspectRenderer();' --timeout-ms 10000 --json`. The App README explicitly documents this Worker inspection entry. Probe revision: `94e99ef4-223f-4cf3-ad7c-19cbb3f933c7` (now stopped; do not reuse it).
- Expected: the documented complete detached RenderInspection Result can cross the CLI JSON response, or a precise bounded unsupported-field diagnostic identifies the nonserializable subject.
- Actual: CLI exit1, `script-result-unserializable`, expected "the live DevKit service to accept the request", hint to return plain JSON and omit cyclic values/BigInt/functions/handles. Exact nonserializable field/root cause has not been isolated. Direct renderer root was absent in Engine Worker eval; this was resolved through the documented `execution.inspectRenderer()` route, not by changing Worker topology.
- Supported read-only observation workaround: call the same execution inspection API, select actual existing facts, JSON.stringify that subset inside eval, and return the resulting string. Selected profile/capability/shadow/SSR/volume/probe/Bloom/output fields succeeded; this is explicitly a subset, not complete-inspection success. Function omission/BigInt conversion is disclosed in the retained script.
- Evidence: project-level `../../evidence/engine-runtime-probe/worker-renderer-inspect.json` (failure), `worker-renderer-summary.json`, `worker-renderer-features.json` and read-worker-renderer*.js (actual calls), `runtime-probe-summary.json`. Screenshot `historical-engine-probe.png` was viewed; frame1519,1280×720,console0/page0,fatalnull. These paths are relative to the game root, not this docs directory.
- Status: open tooling serialization issue; selected-field read recovered. No Engine/core/source/asset modification, installation, upgrade or speculative bug fix. Full result remains unqualified; no performance or new-design acceptance inferred.

## 2026-10-28 — Historical runtime probe: caller startup budget expired before owner became ready

- Scope: persistent DevKit startup and external caller observation budget on the same historical game/toolchain. The initial `dev status` was stopped; no other active session was replaced.
- Reproduction: run `pnpm exec forgeax dev start --headless true --backend hardware --json` under an external Python `subprocess.run(..., timeout=60, capture_output=True)` wrapper. The start schema has no startup-timeout argument;60s was the observer budget, not an invented CLI parameter.
- Expected: caller receives a completed startup response within its chosen budget, or can determine the actual persistent owner state after the observer wait ends.
- Actual order: start began2026-10-28T07:41:57.528524Z; the60s wrapper expired without stdout/stderr. One subsequent `dev status` returned ready with revision `94e99ef4-223f-4cf3-ad7c-19cbb3f933c7`, hardware/WebGPU, healthy world and frame3. No second start was issued. Exact ready timestamp and startup root cause were not measured; this is observed startup latency/caller-budget behavior, not a proven engine-startup defect.
- Later observations: original owner served real screenshot and read-only Worker inspection; after evidence collection, `dev stop` succeeded and final status returned stopped. The diagnostic URL is no longer handed over as a live preview.
- Evidence: game-root-relative `../../evidence/engine-runtime-probe/dev-status.json`, `help-dev-start.json`, `dev-start-hardware.json`, `status-during-start.json`, `status-before-stop.json`, `dev-stop.json`, `status-after-stop.json`.
- Status: safely recovered by status inspection of the existing owner; startup timing cause remains uninvestigated. Future callers should retain timeout evidence and inspect status before retrying or replacing an owner. No blind retry, upgrade or author change was made.

## 2026-10-28 完整 v2 首次运行资源容量失败
- 复现：原生 `forgeax dev start --headless false --backend hardware --rhi-capture true`，加载1261 mesh的Cyberpunk_PDR_v2.glb。
- 实际：backend构建完成，但scene加载抛出 `AssetError asset-budget-exceeded / available dependency capacity`，未产生有效v2引擎画面。默认maxDependencies=1024（assets-runtime AssetRecords）。
- 证据：../../evidence/runtime-integration/engine/first-start-failure.json及dev-start.json。
- 处理：保留原导出及错误，尝试无损网格资源去重；不修改Engine核心。状态：修复验证中。

- 第二轮：去重342mesh后通过资源容量加载，但Scene实例化因SpotLight.range非有限f32失败。导出GLB无range，原生导入未提供可实例化有限值。原始错误保存在../../evidence/runtime-integration/engine/dev-start-dedup.json。运行专用副本按已有源source_range_m填有限范围，并采用源intensity_cd_candidate，32灯不变；原始导出保留。

- 后续原生private-browser载体曾ready后App进入stopped，dev capture/eval返回app-not-started，原因尚未确认；独立IAB相同工程实际渲染和数字1–9切换成功。View旧编辑目标在源热更新时实际显示host-assembly-invalid: one unambiguous project host binding（chunk-O7QEAHSA hotUpdate）。不把通用device-lost提示当GPU丢失确证，不修改SDK核心。

- View已原生打开完整scene资源且实际显示视口/前1000个实体，证据view-editor-loaded.png。点击Load more后原装UI请求scene.tree.get携带revision字符串2349，但contribution要求integer，错误$.revision: expected integer；保留AX证据。使用原生CLI显式整数分页查询，不改SDK。


## 2026-10-29 scale calibration reload during authoring
Native live file watcher attempted compilation while Pack/forge.json/import membership were being updated. Actual plugin-bootstrap-failed reports source changed during plugin compilation, membership changed, and forge.json SHA mismatch. Evidence: Cyberpunk/evidence/scale-calibration/engine/reload-before-build-failure.log. Recovery: stop original live owner, finish author/import transactions, then fresh native dev start. No SDK changes. Acceptance pending fresh execution.


## 2026-10-29 glTF reimport orphaned source overrides
Reimporting a changed deduplicated mesh inventory under the same external source returned ok, but subsequent startup failed pack-malformed-meta with ajvErrors unknown-source-key. Native-generated sourceOverrides still referenced old mesh keys absent from refreshed descriptors. Evidence: evidence/scale-calibration/engine/invalid-reimport.meta.json and invalid-reimport.log. Archived source+sidecar intact outside assetRoots under .assetlib/staging/scale-invalid-reimport; recovery uses fresh versioned source names and native imports. No hand-edit of sidecar or SDK.


## 2026-10-29 scale derivative lighting unit regression
Actual before-verify.png and camera suite show gross overexposure. Compared lights by exact name: new Blender exporter KHR values BK-01=5163.38 vs prior runtime candidate49, BS-01=11413.8 vs10.4, BT-01=1195.73 vs2.2. These are different units, not geometry scale. Restore prior verified candidate intensities by name in both comparison GLBs; keep source ranges. Do not grade around the error. Failed pixels preserved separately; corrected runtime verification pending.


## 2026-10-29 FPS navigation / multi-client observations

ForgeaX 0.4.18 hardware backend with RHI capture: native verify and diagnostic jump succeeded. Opening the live URL in Chrome alongside the CLI/private client was followed by repeated live-revision-stale on status/eval (surface-observation, keyboard-navigation, surface2-observation in ../../../evidence/first-person-navigation/engine). Expected stable revision or explicit target selection; actual world/revision changed. Correlation observed, cause unconfirmed. Chrome AX reports about6GB; actual screenshots18–21FPS and transient2FPS. No SDK changes. Open performance/bridge issue. Independent native UI keyboard screenshots verify visible navigation, not telemetry readback.

## 2026-10-29 underground v3 R1 native backend cold-build timeout
Frozen Gemini GLB04bf100c (55MB,489mesh/36material/56textures) imported via native authority. New observer typecheck passes; existing2Spot shadow requests and no newPoint/Spot. Native dev start fails live-not-ready: live project backend build timed out after owner300000ms bound (source live-dev.ts1083); no browser/frame and no render acceptance. Exact start JSON and startup-timeout-r1.log under evidence/art-direction-v3/engine. Standalone native project build selected to diagnose/warm the asset closure without bypassing startup gate. No SDK edit or raised timeout.


## 2026-10-29 collision adoption readiness (consumer fix)
Initial physical-navigation run attached colliders immediately after scene instantiation, when imported MeshFilter handles were still zero. Runtime readCollision reported requested/admitted=0; controller fell below ground. Startup/render verify passed but interaction failed: it was not accepted. Evidence: ../../../evidence/physical-navigation/engine/{collision-roster,query-source}.json. Fix in consumer observer: retain all expected solid mesh entities, attach when their managed Mesh refs are readable, and freeze KCC movement until every body is admitted. No Engine/SDK edits. Revalidation pending at this entry.

Collision diagnosis correction: the ECS query iterator reuses a borrowed row facade (ECS README Rows/iteration). Array.from(query) retained only the final row, causing the first zero-admission attempt and the later one-admission attempt. Evidence deferred-roster collision-roster.json: expected1834,pending1833,admitted1; the initial zero count alone did not prove global mesh async readiness. Consumer fixed to Array.from(query,row=>copied entity/name/handle). Managed reference readiness and the exact source-name coverage gate are retained as separate checks. Initial guard failure Incomplete imported collision roster:0 retained in start-readiness-fix.json; deferred-roster run froze navigation safely while incomplete. Final native retest pending.

Final collision fix verified:1834/1834 static mesh bodies; actual wall/chair block,0/2.6/5.2m main stairs up/down, both stage stairs1.1m, ground/tread jump landing. Immutable GLB unchanged;71 furniture world dimensions unchanged. Native final verify7346b66a/console0/page0. IAB W3C pointer lock returned UnknownError; consumer now supports click-to-look/Escape release without requiring native lock. IAB final reload and actual input screenshots confirm this fallback, not successful W3C lock. Lock warning evidence ../../../evidence/physical-navigation/iab-pointer-lock-warning.json. Input issue worked around; host native pointer-lock issue remains open. Render resolutionScale caps internal rendering1920x1080 without changing viewport/FOV.

2026-10-29 movement report follow-up: current IAB59686 remained rendering at about120FPS. Click canvas, physical S1200ms then A600/D600ms produced visible backward/strafe in actual user tab. No reset/reload/source change used. Initial near-bar view may block forward; prior focus state not reconstructable, so exact original trigger unconfirmed. Restored to aisle and released look with Escape. Evidence ../../../evidence/movement-stall/{before,after-backward,after-left,restored}.png. CLI status waiting and live-app-bridge-unavailable: private verifier browser had closed; does not establish IAB failure. CUA old mixed-browser binding browser.user unavailable recovered by REPL reset and same tab12 binding.

2026-10-29 entrance spawn and persistent HUD: frontend root4324f55b-d8bd-5e7b-a161-308f7656a06b, explicit ui producer01cf39db-5c41-4350-ba15-165fa6f1705e. CLI help asset add absent and asset import rejected.ui.html(source-package-importer-missing), while existing SDK template explicitly supports ui meta producer. Adopted that same handwritten author sidecar; actual native cook/load/mount succeeded. No SDK changes. Real canvas focus/visibility and source acknowledgement drive keyboard gate and HUD; source clears motion on lost focus. Five targeted tests/typecheck and native verifyf983cf79 console0/page0 passed. Actual IAB reload,click/W,jump,Tab loss of focus,fixed camera status andR entrance restore captured under ../../../evidence/spawn-hud. Existing source GLB/layout unchanged.


## 2026-10-29 native RHI replay provider unavailable (art010 baseline)
Native rhi capture and summary succeeded for the running R4 source (806716ee, frame19729; 4114 commands/36 passes/885 resources). Native rhi inspect --work-index 859 --fields '["pipeline","bindings"]' failed with replay-backend-unavailable: installed portable SDK lacks engine-dawn-node/dist/native/darwin-arm64/dawn.node. Evidence: ../../../evidence/art-refinement-010/rhi-transmission-structure.json and corresponding command JSON. No SDK/native addon rebuild or engine-core change attempted. This does not establish a live renderer defect or optical acceptance. Tape summary reports three unseeded resources, so replay pixels cannot be treated as complete evidence. Continue actual native live screenshots, material admission and controlled light A/B; transmission/refraction remain unverified until those checks. The original capture and failure are retained.

2026-10-29 art010 read-only baseline material preview: native asset material preview --guid 01a1860a-3440-7818-9d8f-897680ddf1bb --size512 failed tool-preview-timeout after owner120000ms. Evidence ../../../evidence/art-refinement-010/baseline-liquid-material-preview.json; no producer change or blind retry. Existing live IAB still rendered before/after this attempt. Native dev capture also returned live-instance-changed then, after fresh status inspection, live-revision-stale; exact responses retained under art-refinement-010/engine. Actual IAB baseline screenshots were recorded separately; these failures are not counted as optical or visual acceptance.

## 2026-10-29 v4 decoded-texture content budget failure
Native import of frozen61b734ba v4 GLB succeeded (574mesh/54material/84texture,712 inventory), but hardware dev start failed root app-execution-bootstrap-failed -> AssetError asset-budget-exceeded: available content bytes. Exact returned cause/stack preserved in ../../../evidence/art-refinement-010/engine/start-r5-optical-preview.json. No successful v4 runtime pixels at this point. AssetRecords default maxBytes is1GiB; actual GLB inspection finds80 embedded2048x2048 PNGs, estimated level0 RGBA8=1280MiB before geometry (old workingR4 has61 such images=976MiB). This is a decoded-content byte issue, distinct from1024 per-closure dependencies. Recovery selected: preserve full-resolution DCC/GLB, create an explicitly labelled runtime export profile keeping basecolor/emission2048 and resampling data-only normal/packedORM to1024 with normal-vector renormalization, then reimport and actually run. No SDK/core/budget-private-field edit or replacement AssetRegistry. Startup log also shows temporary frontend URLs replaced/closed; IAB connection-refused to63109 retained as failed observation, not scene evidence.

2026-10-29 v4 macro inspection: native dev camera set returned observer pose, but actual compositor still rendered explicit selected CAM09 CameraView; r6-liquid-off/on show VIP sofa, not bottles, so invalid optical evidence and retained as failure. Inference: custom explicit CameraView owns render selection independently of transient observer metadata. Added a consumer-owned fixed inspectAsset intent that selects an already imported camera/view and changes only its transient pose, preserving saved19 source poses. No SDK edit or renderer substitute. Actual macro revalidation pending. New runtime geometry wall/chair block, ground jump/landing and full stairs0/2.6/5.2 actual native solver probes passed under r6-physics.

## 2026-10-29 R7 macro inspection restart
Source-owned CameraView inspection pose added and typecheck passed; native start failed before readiness with `live-not-ready` / `live project backend build timed out`. Evidence: ../../evidence/art-refinement-010/engine/start-r7-macro.json and r7-recovery-status.json. No runtime acceptance from this attempt. Official dev stop then unchanged hardware/RHI-enabled restart R8 in progress; no SDK modification or deadline override. R6 actual nine captures and1995 admitted colliders remain previous-execution evidence.

R8 recovery succeeded with unchanged SDK/hardware policy, revision331435a2-0f9e-4e55-b8d0-982c750f1ddb, actual URL http://127.0.0.1:53168/. Native verify rendered2400x1766/errors0. Valid source-owned CameraView liquid off/on/oblique captures now obtained. They show different direct-light highlights/brightness, but most bottle interiors look milky gray and liquid boundaries are weak compared with paired Blender source; optical art acceptance is not passed. Off/on changes only existing BS lights(scale0/1), actual camera/exposure/state JSON retained. No assertion yet of a renderer bug/root cause. Existing `renderer.inspect()` eval fails because renderer is undefined in worker eval context; exact error r8-transmission-inspection.json retained. Do not work around with custom shaders or remove liquid geometry/optical parameters.

## 2026-10-30 新布局运行集成014 / 构建期间源变更（已定位，待稳定版复验）

Codex在首次场景启动成功后进行照明迁移，构建时又修复pdr-newlayout-lighting.ts类型读法，实际DevKit报plugin-bootstrap-failed，detail明确source changed during plugin compilation，expected ea9322a3 / actual2b472bda。属于本次作者改动时序，不归因SDK缺功能。保留Runtime_Integration_014/start-final.json和.forgeax/dev.log。现已固定源码，等待watcher重建/最终实际verify，不对失败执行签通过。另用户原PATH pnpm缺cache依赖，已采用项目既有forgeax-toolchain PATH，无升级SDK。


## 2026-10-30: full-scene RHI capture hang and alpha-mask white holes (unresolved)
Actual hardware runtime21799bb9 after recovery, asset c4f5dc68. CLI rhi capture on previous51aa runtime timed out100s, next eval live-eval-running; documented reload40s timed out then remainedstarting. devstop succeeded, same-source capturefalse start compiled~3min and rendered normally. Failed operations remain014/evidence/stair-rhi-timeout.txt and stair-before-pose*.json. No tape/GPU owner proof obtained; no core changes.
Native screenshot014/evidence/stair-through-before.png clearly reproduces white diamond holes through STAIR_W MASK material; probe0 screenshot unchanged. Actual handle172 M_LATTICE_STEEL alphaCutoff.5,alphaMode0,double-sided,no transmission/emission,texture171. Source uses parallel4mm alpha planes. Further alpha/depth and materials A/B required before fault attribution. User lighting complaint separate: all6 stage cones excluded deck;4 native direction/cone candidates actually rendered improved deck/monitor/backwall in stage-before vs stage-after-direction. Geometry/art remainsunaccepted; stage lamp-head articulation assignedDCC.


## 2026-10-30 R06 offline mist cache / live identity instability
Author added an actual Blender Mantaflow R06 3D-density sequence through public TextureAsset + VolumetricFog; typecheck passed. First live eval posed camera then returned script-result-unserializable; mutation may have succeeded, so it was not treated as rollback. Subsequent plain-read/verify calls failed live-revision-stale across423f0811/c798e5a4/080f2e70/824f723c, despite ready/healthy reports and no further Engine author edits. IAB scene was navigated toblank to reduce owners, but another operation stillstaled. SDK public source refreshBridgeStatus changes revision when worldIdentity changes; cause of replacement is not proven. No SDK edits. Documented devreload timed out60s; devstop succeeded. Evidence ../../Runtime_Integration_014/evidence/manta-r06-*.json. A new single-owner start follows currentD044 full-dance-floor density source batch; failed R06 exact-execution validation is not passed bytypecheck, Blender renders or earlier low-mist images.

Single-owner devstop/start recovery rendered D044 revision661774fb and verified2400x1766/errors0. This closes the transient blocked test setup, not the underlying world-owner cause or any fog art issue. UserD045 rejects the low2.4m layer/flat top; D044 rejected-low-layer.png preserved. Current source batch replaces it with approximately uniform-height 3D advected density bounds -.5..9m, beyond both roof candidates, broadens actual existing ceiling cones to78deg, and reduces failed R06 plume contribution. Pending new actual runtime/motion/upper views.

D045v2 author registration initially used non-existent World.setResource, caught bytypecheck-D045-flow-v2.log. This was an author API error, not an SDK feature failure. Stopped the compiling owner; read existing project and public World contract; corrected toinsertResource. New source uses two-octave advected3D value noise and source-owned bounded tuning resource. Previous D045native first version is independently rejected N01excess veil/N02weak motion; no art acceptance inferred fromtechnical verify.
# 2026-10-30 D047 local wet-floor / SSR integration

Pinned ForgeaX0.4.18; no SDK changes. Added only game-owned ground UV1/material adaptation and native camera ScreenSpaceReflection. First real runtime2986caf0 had SSR admitted/deferred/history stable with six SSR roster stages, two completed native reflection probes, actual fixed-pose dry/wet and SSR OFF/ON PNGs under ../../Runtime_Integration_014/evidence/D047-AB-*. Material maps were not AI images or stored mirror images. Coverage hit counts were null, not measured zero/positive.

Observed startup exceeded the client's100s wait while backend kept compiling; bounded status subsequently became ready at http://127.0.0.1:61879/ after roughly3min. Preserved client timeout; did not restart a healthy compilation. Earlier c468 runtime had repeated live-revision-stale with multiple observers, and IAB control reported browser.user unavailable. A fresh owner for the changed source had a stable revision for the whole six-frame AB sequence. This does not prove the general multiple-observer issue fixed.

Two early captures did not match the immediate inspection-pose readback; later reapplying the source pose produced the six correct main/low/side frames, independently viewed. Cause remains unconfirmed; no claim that verify, physics or SDK camera code is the root cause. Early mismatched frames are not accepted as fixed-pose evidence. First wet-film visual had overly periodic ripples; new game-owned material refinement awaits fresh runtime evidence. See project PROGRESS D047 for exact state and retained failures.



### 2026-10-30 D048二楼集成：已修复源登记与格式错误

Codex首次复用旧GLB Meta，但其source仍指向移出活动目录的R8，实际启动报pack-orphan-meta。已保存失败副本到Runtime_Integration_014/D048-failed-import，改用正式asset import建立新GUID闭包。导入器进一步真实拦截WB的specularColorFactor=1.1以及两个匿名sampler的重复sourceKey；仅在集成副本将范围夹到glTF上限1.0、赋唯一Sampler名，WB原文件不改。最终bcf6514f GLB/新Scene GUID 01a18cc0-f159-7553-a50c-527de6f6d645已导入并实际运行于revision cf16774e/URL50893，截图evidence/D048-upper-corridor.png。属于源集成错误已修复，不是SDK改造。按用户D048要求不追加回归/AB/独立审查，不把运行截图称全项验收。


### 2026-10-31 D049 FX and camera capture

Public-space fog/wet footprint connected; WB upstairs and32 lights retained. TONEMAP_ACES_FILMIC is4; the former value1 was not ACES. Actual505e78e4 camera uses GTAO algorithm1/medium/half-resolution and TAA3; native AO/TAA/SSR/Bloom/volume work is recorded. No SDK edits. A dev camera observer position initially did not match the captured entrance view; releasing the observer and using source inspectAsset produced the real stage view. General cause remains unknown. D049-stage-flow.png is an entrance image, not stage evidence. Correct stage/floor images and the original-interval10-frame GIF are in014/evidence. Final attribution-comment-only HMR is ready69416cee at http://127.0.0.1:53664/; behavior unchanged. Per userD048, no extra regression/AB/independent review; discrete droplets and moving drink liquids remain incomplete.


### 2026-10-31 D050 first native fluid-frame failure

The new droplet batch was authored with position/normal/uv0 but no tangent attribute. The actual held-page capture failed white with shadow_caster vs_main vertex attribute slot3 missing in VertexState; report014/evidence/D050-first-failed-run.json and failed PNG D050-drinks-live retained. Liquid resources updated10 nearby objects and droplets112/160, but this is not a rendered success. Repair is to supply an orthogonal unit tangent stream in the owned mesh and use the canonical layout, then restart the same game. No SDK edit, shadow/effect disabling or browser UI workaround.


### D051 / 2026-10-31: built preview delivery and remaining boundaries

- Project-owned startup error: adding Visibility during a live Name query invalidated its structure epoch. Fixed in pdr-fixtures-d051.ts by snapshotting the selected entities before additions; original native startup error retained in Runtime_Integration_014/evidence. Not an SDK fix.
- Live DevKit repeatedly entered reload/start while protected source bytes and observed mtimes stayed unchanged. Cause unresolved; stopped instead of allowing endless cold builds. Delivered the unchanged ForgeaX project through public project build/preview, localhost:53664 (IPv6 listener). Static preview does not expose dev RHI capture. No SDK edits or engine migration.
- Project floor material incorrectly multiplied original ORM.G by a custom map already containing ORM.G. Removed the original metallicRoughnessTexture from that composed material; dry front roughness >=.58, wet deep region remains low roughness. Original base/AO retained. First incorrect built images preserved separately.
- Final build manifest df511a064f6176af4d2a902221b7c3c65cdda1055fd513eff40811033bd7d2a5: four first-party Engine SDK captures, fatalError=null and empty console/page errors. Actual views include front, transition and stage; external input/camera changes occurred, so this is not a fixed-camera benchmark or an agent-driven collision route. HUD28..31.9FPS; submitted-frame observations28.33..29.19/s with screenshot latency. Internal cap1600x900 is a different quality configuration from the old1920x1080 baseline. No all-scene minimum-FPS or independent art acceptance claim.
- Nested glass refraction/caustics and distant droplet visibility remain unresolved. Do not restore full-front fog/wetness: latest D051 user explicitly wants a dry, nearly fog-free foyer.


## 2026-10-31 D052 — drink shell material adaptation and native build

Scope: project author assets only; ForgeaX0.4.18 unchanged. Previous uniformly alpha-blended glass shells retained visible gray diffuse under pink lighting. Adaptation uses public Standard custom Surface authoring and the ordinary Pack shader cook/GUID load: zero glass diffuse, Fresnel opacity and native GGX/IBL/direct specular, ONE/ONE_MINUS_SRC_ALPHA composition. Liquid alone keeps the native volume transmission backdrop. Five near glass meshes are actual refined Blender profiles at original dimensions, formally imported. This corrects the project approximation; it does not fix native singleLayer transmission or add exterior refraction/caustics.

Actual `project build --target browser` succeeded, with existing Vite WASM URL/chunk-size warnings retained in014/evidence/D052-build.stderr. Native built hardware AppleMetal3 pictures drinks/stage/chairs are at014/evidence/D052-built, including full capture/report JSON. No console/page/fatal errors in those observations. First-party Engine capture used its own headless hardware owner and fixed application bookmark links; no generic browser UI/input or user tab access. Full optical/art acceptance, full-scene minimum FPS and devHMR reload root cause remain open. No extra regression/AB/review suite run per user D048.


## 2026-11-02 D056 single-HTML duplicate runtime identity

Scope: official DevKit single-html exporter, isolated local copy only; game and installed SDK unchanged. After same-origin Worker embedded shader routing repair, exact candidate2 HTML (15e52442d6333524a0a418e8468367c913abc7604dcadbe84fd87401078fb49f) fails actual native hardware startup with plugin-startup-failed / vfx-host-loader-install-failed / duplicate decoder kind "particle-effect". Resource misses/external requests empty; no rendered frame. Evidence: Runtime_Integration_014/evidence/D056-html-http-candidate2-failed/run.json and exported-scene.png; raw failed HTML retained. Separate closure of URL-emitted graphs duplicates shared runtime module identities. Repair remains in single-html owner: preserve logical dist module identity, standard System.register linker per realm and existing closed embedded resource table. No silencing VFX registration checks, engine core changes, or network fallback. Small actual payload regression verifies singleton execution once, cross-owner identity/live bindings/import.meta/TLA. Full native project package and exact HTML startup pending; no SDK-release qualification claimed. The local copy includes MIT SystemJS6.15.1 license and source diff.

D056 actual closure: official CLI package success, exact HTML143078733bytes / SHA256 d924d61c2253d7c30d4c9d75b90da94b946bbd4f964579e6899c3d98487d1af9. Native hardware observation over permitted loopback HTTP rendered frame116 with fatal=null; zero resource misses/external requests/console/page errors, 253 embedded hits. Evidence Runtime_Integration_014/evidence/D056-html-http/observation.json and exported-scene.png. This closes the observed duplicate decoder startup failure for this HTML, not an SDK release qualification. file:// UI policy and >64MiB transport prevent tool verification of direct file opening; no alternate browser access used. Input routes/art quality not reaccepted. Scene repairs remain paused.


## 2026-11-02 D057 actual user-browser startup failure

User reports desktop single-HTML remains blank/loading. Desktop SHA matches D056 d924d61c…87d1af9. Actual normal Chrome at permitted HTTP URL http://127.0.0.1:53861/Cyberpunk-PDR.html reproduced plugin-startup-failed, detail.reason timeout, app-execution-deadline-exceeded phase handshake (native app AX and screenshot). Evidence Runtime_Integration_014/evidence/D057-browser-open/http-handshake-failed.png. Prior headless capture success is not sufficient proof of normal browser startup. Source inspection shows current startupTimeoutMs30000 covers Worker module load and full createRealm/scene activation, not only file download; no root cause asserted yet. file:// tool policy still denies direct navigation; no workaround used. A frontmost reload is being observed via documented CUA browser channel. Scene content repairs remain paused.

### D057 current delivery: actual Chrome startup succeeded; desktop updated (2026-11-02)

Current HTML: 143080018 bytes, SHA256 328eaf68aefd7c3cc08e2dad4d26427690470928f2a790ecbd85ab484c10881e. Project Deliverables and Desktop/Cyberpunk-PDR.html are identical. Full official CLI project package succeeded. All133 embedded compressed payloads and MIME types exactly match D056; distManifest remains334e54ce. Scene/material repairs remain paused.

The visibility-only attempt still failed with handshake timeout; its HTML, receipt and actual error remain in D057-visibility-candidate and D057-browser-open/visibility-candidate-failure.txt. The browser control channel reported visible while the native Chrome tab was not selected, so visibility gating was insufficient evidence. Final packaging owner uses an explicit enter-scene button before Engine initialization; the original30s bounded Engine timeout remains. Payload nodes retain private references after detaching from the DOM; no resources removed.

Actual regular Chrome HTTP reload displayed the button, an actual click started the scene, fatal/loading panels were hidden, captured error/warn logs empty, HUD31FPS. Evidence: D057-browser-open/click-start-result.json and click-start-running.png. This is a user browser, not a headless substitute; FPS is a momentary observation. The live page http://127.0.0.1:53861/Cyberpunk-PDR.html is marked deliverable and remains open. Desktop replacement was atomic and hash-verified. Direct file:// navigation remains untested because browser URL policy blocks it; no bypass was used. User should click the enter button and keep the page foreground during loading. Do not claim all file/open failures fixed or resume scene production.

Earlier D057 visibility-only/packaging-in-progress statements below are historical. The direct public-writer attempt used raw dist rather than CLI bundle preparation, was not delivered, and is retained. The first full CLI attempt failed only on its operation-history directory write; FORGEAX_HISTORY_DIR was moved to the writable project folder before the same CLI succeeded.



## 2026-11-02 D059 — liquid continuation after source/HTML archive

Current D053E explicit diffuseTransmission static layer was actually captured in D059-baseline: the old broad pink diffuse disk is suppressed; liquid still too dark/flat and lacks a readable nearby fixture reflection. No source-normal inversion established. Source shader shows the explicit black diffuse split removes reflected/transmitted diffuse terms while retaining Standard specular and Beer backdrop; do not claim this solves multi-layer glass. Actual static preview capability states rhi.capture unavailable (static-dist-host-does-not-install-dev-capture), so no new RHI tape/replay accepted. Existing recorder/replay limitations retained; continue supported real hardware compositor and source/contract evidence without SDK writes. Candidate adds one small native128px once-captured bar ReflectionProbe with priority20 (actual nearby fixture geometry, not a fake image), stronger still millimetre-scale pinned open-glass waves and measured-depth-dependent pigment absorption. No extra Point/Spot, exposure or scene layout change. Candidate status pending actual build/image.


D059 integration failure retained at014/evidence/D059-final-liquid: actual native startup explicitly threw "WB018 expected the existing roof-light-band object" although the exact node is in the current GLB. Codex integration mistakenly retained query Row bundles through Array.from before reading them; unlike the existing mapper pattern, iterator-scoped rows do not remain stable after advancing. Fixed both new roof/lamp lookups to copy Name+EntityHandle during traversal, then read components through stable handles. This is a project integration error, not missing WorkBuddy geometry or an SDK defect. Failed source is retained at014/rollback/D059-query-failed; fresh same-path build/runtime required. Installed CLI also has asset import, not the old guide's asset add; formal import succeeded, new scene GUID01a19ac5-5ad3-745b-a280-3f341ab888de.

D059 subsequent actual integrated run succeeded after the stable-handle query fix: D059-final-ready contains14 genuine liquid-detail frames, errors0. Viewed images still showed insufficient canopy illumination for a readable liquid interface. Local L02_BAR_CANOPY is actually at[10.85,2.52,-9], above the hero cups; D050 had reduced all3bar sources from280 to18cd while suppressing the previous white-diffuse surface. Candidate restores ONLY centralL02 to65cd/pink-white[1,.45,.70], leaving other31native light intensities/exposure unchanged (WB018 L13 relocation already separate). This illuminates the real counter/objects and native interface, not emissive liquid or a reflection image. Current source/build must be recaptured before acceptance; the previous darker14frames remain.

D059 actual opt-in HUD diagnostics (D059-liquid-diagnostics) show313 liquid objects,183 refined matches,18 active,updates89→97, max displacement1.04→1.11mm, lastError=null. This rules out a stopped CPU mesh updater in those frames; it does not by itself prove visible GPU motion. A new bounded optical-inspection bookmark liquid-light uses the mirror geometry of the actual L02 source over the coupe: eye[10.458,1.64,-8.817], target[10.55,1.2515,-8.86]. No object/lighting/material changes for this step; it tests the view-dependent highlight at the physical reflected direction, preserving existing saved camera poses and original bookmarks. Actual visual evidence still required.


D059 final actual observation: final build manifest3ec38e2b24a867867b7ecc48c6fd68ba5e105297d75638150681976145f91f7d, successful native Apple Metal3 hardware frames in014/evidence/D059-canopy-reflection show the real L02 highlight moving/changing shape with the actual liquid mesh after warmup (frames6–11). Transparent normal-angle views show counter detail/ice and depth-dependent pigment. The timed-samples GIF contains only those actual images at original sampled timing, no interpolated frames; CPU diagnostics are corroboration, not the visual-motion claim. Final entrance/stage real frames also show the WB018 selected geometry actually integrated, no fatal/console/page errors. No overall art acceptance, full nested refraction/caustics/CFD or new RHI tape claimed. D057 Desktop/UGit HTML snapshot remains unchanged.

D059 user Chrome startup also reproduced the known30s handshake timeout when createBrowserTab left the new scene tab in the background. Actual CUA diagnostics recorded at014/evidence/D059-user-browser-open/initial-background-failure.txt. Selected/raised real tab, then one foreground reload; result pending. Do not claim this known startup problem fixed or confuse headless success with user-browser reliability.

D059 foreground result: actual CUA regular Chrome completed scene startup after that one foreground reload, transparent liquid/ice visible, normal HUD25FPS, no fatal/loading panel; deliverable tab retained. Receipt014/evidence/D059-user-browser-open/foreground-result.json. Background-start reliability remains unresolved, not hidden by the successful foreground case.

D060 archive update: same repaired official CLI successfully repackaged unchangedD059author source (all9SHA checked), new packaged distdb03b29d and HTML0b51d843/143631358bytes/152embedded resources. Exact delivered HTML actually opened in regular foreground Chrome through CUA, enter-scene clicked once; visible full club, HUD33FPS, fatal/loading hidden. Evidence014/evidence/D060-package.json and D060-html-open.json. No file://, new route regression or overall art acceptance claimed; original D059renders keep their original3ec38e2b build identity.


## 2026-11-02 D061 — narrow liquid highlights and nested transmission boundary

Author wave slopes were reduced (open slosh2.2→0.55mm, advected crest0.60→0.08mm) without changing native geometric specular AA or camera exposure. Actual first candidate D061-two-phase-light/liquid-light-1.png shows a small highlight rather than the old broad pale disk. Four new hero glass/volume back/forward author passes were cooked through the ordinary Pack. However actual D061-two-phase-drinks/drinks-1.png loses the inner side-liquid volume behind full refracting outer fronts. Installed native source pipeline/standard-pipeline.ts and standard-forward-lane.ts copy one backdrop before all transmitting suffix draws, so a later glass front samples an image missing the preceding liquid front. A TransmissionBack pass adds another global phase, not arbitrary nested-medium camera transport. This candidate failed the requested full layering; source build receipt and native images retained, no SDK defect patched or independent acceptance claimed.

Hybrid candidate retains native glass backs and reflection-only front composition to avoid erasing the inner liquid; full front-wall refraction is explicitly incomplete. Liquid depth absorption is applied once, not duplicated in an extra volume back draw. Native capture pending on the new hybrid build.

Actual isolated Blender5.2.3 BVHTree photon bake uses current D052 glass and D050 closed liquids for two hero open glasses, actual L02 position, Snell refraction, Fresnel energy, Beer absorption and TIR.102400rays,46367interface events,651paths hit16-event cap; peak irradiance ratio1.166. This is fixed rest-pose/source/counter irradiance data, projected by existing native L02 Cookie with gain2 encoding compensation, not general realtime caustics, CFD or hardware RT. No random highlight image. Original irradiance.npy/source.blend/data and limits retained at016/d061. Initial restricted-process Blender crash is in Metal initialization; same installed app ran successfully with normal process access.

A core transparency/medium extension needs separate user approval under projectAGENTS; the question is pending. Original SDK/store untouched.


## 2026-11-02 — D063 local019 hierarchy/shadow correction
Actual source inspection found mesh DISTANCE sort ignored Layer, and SortKey was only captured for points/lines. Local native source now passes SortKey into mesh snapshots, respects Layer for DISTANCE, uses actual transformed bounds centre when origins coincide, and sorts native transmission draws too. Nine actual-sort-source checks pass; native scene pixels remain required. Four Spot shadow slots are the existing cap: runtime previously enabled only L01/L19, leaving the stage moving lamps unshadowed; local019 now selects four sources by room. This is bounded shadow allocation, not all32-light shadow support. Exact duplicate same-facing same-material static triangles are removed from derivative meshes; dynamic particles/liquids excluded. Original SDK/project protected under user D062. Evidence ../evidence/D063-* and project PROGRESS.


## 2026-11-02 D066 — independently temporal volume versus surface TAA

Actual gallery pixels in D065-volume-gather-actual show block-shaped fog/shadow contamination along the ceiling and ducts. Raising the shadow atlas/bias did not resolve it. Fog-OFF clears it; importantly TAA-OFF with volume and shadow ON also clears the large blocks. A low-resolution depth gather shader experiment did not improve the actual frame and has been preserved then reverted. Static preview RHI capture remains explicitly unavailable (static-dist-host-does-not-install-dev-capture), so no new tape/replay is claimed.

Local019 StandardPost now resolves surface TAA first, then composites the existing independently temporal local volume into a separate linear HDR target. It never writes fog into history.currentColor; Bloom, exposure and tone mapping follow normally. Deferred and standard Forward call the same typed owner; custom forwardOutput retains its prior path. Actual source build d5cfa5b4, Apple Metal3 frames230/264 at evidence/D066-post-temporal-gallery remove the reproduced ceiling/duct blocks with TAA, volume and native shadows all enabled. This establishes the reproduced gallery fix, not all-camera/global temporal acceptance or transparent shadow transport. Original installed SDK entry hash remains unchanged.


- 2026-11-03 D070 舞台字牌候选首轮构建报 `pack-output-reference-missing`。资源已导入，但 `forge.json#assetRoots` 仍声明旧字牌。更新活动字牌的资源根后重构建。原失败回执在 `../evidence/D070-headline-build.json`。

- 2026-11-03 D076 舞台灯牌构建。游戏目录的 ForgeaX 启动器解析到原 SDK 的 DevKit，产物 TAA entry 变为 9b219403，已拒绝切换并保存于 `../history/D076-before-poster-led/rejected-old-shader-dist/`。使用已有 019 本地绑定的 DevKit 重构后，着色器 SHA 632f519b 与上一活动版相同，成功启动并拍到新字牌。CLI 首次导入需要可写的 `FORGEAX_HISTORY_DIR`，切到项目 operations 后成功。project check 使用既有 Node 22.22.3 和 pnpm 12.10.1 工具链通过。实际回执见 `../evidence/D076-*`。

- 2026-11-03 D078 实体灯槽和旧灯罩复用。即时生成新 PBR 材质导致 `material-specialization-not-cooked`，第二个在 Pack 中单独发布同类材质的候选出现 `material-artifact-conflict`。复用现有灯带材质，并将新增灯罩类型绑定到已能运行的暖黄材质后，86f60d13 正常渲染三机位。失败回执见 `../evidence/D078-gold-entrance/run.json`、`D078-final-entrance/run.json`、`D078-rejected-practical-variants/run.json`。未改 SDK。
