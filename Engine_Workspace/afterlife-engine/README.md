# D060工程与HTML更新（2026-11-02）

当前D059作者源已正式重新package成单HTML：`../../Deliverables/Cyberpunk-PDR.html`，143631358bytes，SHA256 **0b51d84398b697f3f6163a3b31b1e6be53813a93595338b2cce58e2e7ba82a2e**；152内嵌资源，package构建manifest **db03b29dd8b5f0ac54299d35a9c4f825c5b18177678aa6064f87d73fa50101b3**。实际Chrome以同文件loopback HTTP前台点击进入后出图，HUD33FPS；直接file://未验证。旧D057与D059构建身份保历史，不冒充同一构建。下方D059“HTML未更新”是此前交付时状态；本轮用户已明确要求更新UGit。

近期真实图片在`../../Deliverables/Progress_2026-11-02/`，含标注版本的整馆/舞台/桌椅/酒液和实际采样动图。当前仍为迭代，不称全部光学/美术终验。下面保留历史使用和问题说明。

# 当前D059实际场景（2026-11-02）

**本轮新场景：http://localhost:53664/**。直接查看[透明酒液与液深](http://localhost:53664/?view=liquid-top)、[灯光随波反射](http://localhost:53664/?view=liquid-light)、[舞台](http://localhost:53664/?view=stage)。WASD移动、鼠标环视、Space跳跃、R回门口，J扰动液面；点击画面获得输入。服务关闭后双击本目录open-built-scene.command，源码修改须先正式build。

当前正式构建manifest SHA256 3ec38e2b24a867867b7ecc48c6fd68ba5e105297d75638150681976145f91f7d。清酒液已去粉白漫散射，保真实深度吸收、透明与毫米波面/原生光照反射；WorkBuddy018参照丽姿的前厅宽灯带、底座灯槽和舞台侧板已实际导入运行。保ForgeaX0.4.18、32原生灯及现有布局/控制。液面为受约束网格运动近似，外壳为薄层近似；不承诺完整多层折射/焦散/CFD或整体美术终验。

证据及当前源SHA在../../Runtime_Integration_014/evidence/D059-current-receipt.json，实图及实采样GIF在D059-final-transparent、D059-canopy-reflection、D059-final-entrance、D059-final-stage。**桌面HTML及UGit归档仍为D057旧快照**，本轮没有重新打包/推送。下方暂停/HTML说明为历史。

# Current D057 HTML delivery (2026-11-02)

Use Desktop/Cyberpunk-PDR.html or project Deliverables/Cyberpunk-PDR.html. Click the enter-scene button, then keep the page foreground while loading. Actual normal Chrome HTTP startup succeeded; direct file:// was not tool-tested due URL policy. Current open preview: http://127.0.0.1:53861/Cyberpunk-PDR.html.

SHA256 328eaf68aefd7c3cc08e2dad4d26427690470928f2a790ecbd85ab484c10881e;143080018bytes. Same133 embedded resource payloads as D056, only startup packaging changed. Scene repairs remain paused. Previous version notes below are historical.

# 当前单HTML交付（2026-11-02，D056）

当前场景已导出为项目`Deliverables/Cyberpunk-PDR.html`（143078733字节，SHA256 d924d61c2253d7c30d4c9d75b90da94b946bbd4f964579e6899c3d98487d1af9）。可单独复制这一个HTML，用支持WebGPU的桌面Chrome打开；首次需等待内嵌资源解压。点击画面后WASD移动、鼠标环视、Space跳跃，Esc释放鼠标、R回门口；1–9保存机位。沿用当前完整场景/控制，没有继续材质修复。

精确文件已通过本机HTTP原生硬件观察出画面，资源缺失/外部请求/页面错误为0，证据`../../Runtime_Integration_014/evidence/D056-html-http/`。文件直开因浏览器工具政策未实测；未复验键鼠路线或视觉品质。临时预览为http://127.0.0.1:53861/Cyberpunk-PDR.html，静态host关闭后该URL失效，HTML本身保留全部资源。旧53664开发/构建服务不属于当前打包交付。

打包修复只在`../../Runtime_Integration_014/tooling/devkit-single-html-fix`隔离官方DevKit所有者，原SDK和Engine运行时未改、未升级；正常官方project package流程。当前场景修复按用户指令暂停，下面均为历史。

# D052 当前构建预览（2026-10-31）

当前真实ForgeaX场景入口：**http://localhost:53664/**。点击画面后WASD移动、鼠标环视、Space跳跃，R返回门口。当前服务仅监听IPv6回环，旧127.0.0.1地址不适用。关闭后双击本目录`open-built-scene.command`启动已构建版本，并保留终端窗口；修改源码后先正式build。

直接查看：[杯瓶酒液近景](http://localhost:53664/?view=drinks) · [普通桌椅](http://localhost:53664/?view=chairs) · [悬挂射灯与舞台](http://localhost:53664/?view=stage)。这些链接选择同一真实场景中预定义的相机，R回门口，不另建展示场景。

D052增加五件原尺寸玻璃杯瓶的真实细分/杯沿瓶口微倒圆；313饮具壳使用原生Standard光照的Fresnel反射薄层，去灰白漫反射；内部液体保透射和闭合网格动态。外壳尚无完整折射/多层光路/焦散，不冒称完整物理玻璃。保D051干燥近乎无雾前厅、舞池湿雾连续过渡、18桌椅、两套悬挂旋转Spot、原二楼/六吧凳/32灯与1600×900内部上限。实际图与采样边界看项目docs/PROGRESS.md最新D052；未新增独立终验或全馆性能保证。

以下为历史记录，以本节和项目最新进度为准。

# D051 当前构建预览（2026-10-31）

正式构建入口为 **http://localhost:53664/**，Vite当前仅监听IPv6回环；旧的`http://127.0.0.1:53664/`不是这个可用入口。关闭服务后可双击`open-built-scene.command`再次启动已构建版本；留着终端窗口。源码有新改动时先用`pnpm exec forgeax project build --target browser --json`更新构建。原`run-engine.command`为开发热更新方式；D051实查它在源文件未变时反复重载，原因未确定，不称SDK问题已修。

当前源已接入干燥/近乎无雾前厅，舞池到前厅连续过渡，18个桌边普通椅模型和朝向/间距修复，2套桁架悬挂旋转Spot灯具。保第一人称、二楼、六吧凳、32原生灯、SSR/雾/后处理；内部像素上限1600×900是新的画质配置。完成状态与实际画面/性能观察以项目`docs/PROGRESS.md`最新D051为准，不以本段说明签美术/性能验收。旧D050/D049说明以下保留为历史。



# Historical Cyberpunk PDR — D050 runtime (2026-10-31)

Current authority is this project's `forge.json`: R8 ground + WorkBuddy015 r4 upper floor, native Codex mist/wet floor/post effects and D050 liquid/droplet assets. Historical layouts and ports below are retained as history.

Start the current scene by double-clicking `run-engine.command` in this directory. It uses the pinned ForgeaX0.4.18 toolchain and prints the actual local URL; ports change between runs. `pnpm exec forgeax dev status --json` returns the current URL with the same toolchain on PATH. Do not use historical active-candidate files to reset the current roots.

Click the scene for WASD/mouse/Space. R returns to the entrance, N selects the staircase entry, 1-9 selects saved views. 9 is the drinks close-up; J excites a small damped liquid-surface ripple. Building/layout/human scale, the upper rooms and32-light ceiling remain.

D050 editable base assets: `../../Codex_FX_016/source/d050/liquid-droplet-templates.blend`; source script and receipt are in016/scripts/d050 and016/logs/d050. Liquid surface modes and batched3D droplets are native runtime mesh deformation, not two-phase CFD. Liquid uses native volume transmission; paired drink containers use lit alpha thin shells because the current renderer provides a single transmission backdrop. This is not complete nested-glass refraction or caustics. Project state: `../../docs/PROGRESS.md`; current source/runtime receipt: `../../Runtime_Integration_014/active-candidate.json`.

## Historical v4 runtime checkpoint

Open http://127.0.0.1:53168/ while the current native owner runs. Restart with project-root `打开地下俱乐部v3.command`; it restores the active v4 GUID and returns the actual port. Source of runtime selection: `../../Runtime_Integration_v3/active-candidate.json`.

ForgeaX0.4.18, hardware WebGPU, original Pack/GUID import. Editable Gemini source: `../../Art_Direction_v4/underground-v4.blend`; runtime texture sampling derivative: `../../Runtime_Integration_v3/export/underground-v4-runtime.glb`. Full-resolution source/export remain preserved. Codex authored integration/lighting/navigation and runtime texture profile; Gemini authored/executed isolated Blender production. This is a real full-scene checkpoint, not final high-fidelity acceptance.

Default/R/P: main entrance eye[16.7,1.64,12.4]m; click canvas then WASD,Shift,Space; mouse look,Escape to release,RMB fallback;1–9 saved views,N stairs. HUD reports actual focus and collision readiness. Original71 furniture root relationships,19 saved cameras,protected structure and32 Point/Spot ceiling preserved. Native Rapier1995 actual mesh colliders and1.75m capsule; no height sampler. Source-owned transient macro inspection does not replace saved cameras.

R8 native verify revision331435a2 rendered/errors0; actual IAB click,W,jump,look,R/Esc evidenced in `../../evidence/art-refinement-010/engine/r8-*`. R6 native wall/chair/jump/main-stair trajectories remain same physics-source evidence. Browser unlock fallback is bounded by window. Render cap1920x1080 preserves16:9/FOV.

Known open art issues: gray/milky Engine bottle/liquid optics despite actual separate closed liquid volumes and imported transmission/IOR/volume; valid r8-liquid-off/on shows light response but does not pass clear-liquid appearance. Backbar bright cores, flat floor lighting and saturated VIP remain under independent review. Static liquid geometry is not slosh/fluid simulation or caustic proof. Original SDK source has not been modified. Full-resolution startup exceeded native content budget; only normal/ORM runtime sampling reduced to1K, color/emissive remain2K. Review and feedback preserve failures.

# Cyberpunk Bar V4 (historical)

Standalone ForgeaX Engine game importing the supplied WorkBuddy Blender V4 cyberpunk bar scene.
Engine, View and SDK are pinned to stable **0.4.18**. This project runs without Studio.

## Run

The built playable entry is http://localhost:5173/ while the preview server runs. Start it again with `./play-engine.command`; open the URL printed by that command.

For development, use Node 22.22.3 and pnpm 12.10.1. The local isolated toolchain is selected by `run-engine.command`:

```sh
./run-engine.command
```

Or with a supported toolchain on PATH:

```sh
pnpm exec forgeax dev start --headless false --json
pnpm exec forgeax dev status --json
pnpm exec forgeax dev stop --json
```

The startup response supplies the local game URL; ports are assigned dynamically.
Click inside the game for pointer lock. WASD moves, Shift runs, Space jumps (from the ground only, one jump per press), mouse looks, arrow keys turn, and Escape releases the pointer. Right mouse drag also turns while unlocked.

## Content

WorkBuddy V4 source: `/Users/arkliang/WorkBuddy/2026-10-27-19-13-32/cyberpunk_bar/cyberpunk_bar_v4.blend`.

56 × 36 m venue, 12 m high, with a 22 × 10 m west-wall stage facing the full bar, four front booth islands, white L-shaped bar and upper lounge at +5.6 m. A 22 m shallow water ribbon follows the east perimeter. No human figures are imported.

`assets/Cyberpunk_Bar_V4.glb` is the runtime derivative: 31 material batches, six portable baked procedural maps, 30 imported local lights, four native volumetric zones and 196 collision bodies. Standard Engine supports at most 32 local lights; individual candle bulbs stay emissive while larger authored washes provide their illumination. Runtime export removes subdivision modifiers from small props to stay within importer limits. User originals are untouched. V3 project source and model are backed up in `.assetlib/staging/before-workbuddy-v4/`.

`forge.json` selects the Engine root Pack. `assets/afterlife.pack.ts` retains existing plugin GUIDs and composes Rapier, scene instantiation, the first-person controller, atmosphere and neon plugins. Assets use the native AssetRegistry. Blender Cycles and Engine lighting are not pixel-identical; imported procedural water is a static material, not a fluid simulation. Small stools and foliage are visual-only to preserve navigable aisles.

## Checks

```sh
pnpm exec forgeax project skill verify --json
pnpm exec forgeax project check --json
pnpm test
pnpm typecheck
pnpm exec forgeax asset verify --json
pnpm exec forgeax project build --json
```

Local browser evidence is under `artifacts/migration/`. See `docs/migration.md` for migration scope and `docs/feedback.md` for observed issues. The old Studio project and Blender files remain separate backups.

## Current limits

This is a playable visual/material test. Engine tone mapping, punctual-light approximations, native fog and refraction differ from the Blender Cycles render. Observed Chrome frame rates were roughly 18–27 FPS during traversal; no performance target has been qualified. Room partitions, railings and some small props still need collision refinement. Prioritize material-by-material tuning and measured light/fog optimization. Keep water confined to the decorative ribbon; do not turn the walking floor into an all-over wet reflective surface.

The original pre-V3 source closure is archived under `.assetlib/staging/before-lizzie-v3/`. Blender source remains in `../../Lizzie_Study_v3/Lizzie_Study_v3.blend`. Runtime startup verification and captures are under `artifacts/lizzie-v3/`; native layout checks are in the Blender source folder.

## V4 acceptance

The final build passed 11 tests, typecheck, project/asset checks and hardware-browser runtime verification (zero console/page errors). The served build at http://localhost:5173/ was separately walked in Chrome, including staircase ascent to the upper lounge and walking after reload. See `artifacts/workbuddy-v4/playable.png`, `upper-lounge.png` and `dev-verify.json`.

## V5 tuning (2026-10-28)

Furniture comes from `cyberpunk_bar_v5.blend`, generated from the unchanged V4 by `make_cyberpunk_bar_v5.py` (same WorkBuddy folder); `../../import_workbuddy_v4.py` now reads V5 and still writes `assets/Cyberpunk_Bar_V4.glb` so the sidecar GUIDs stay stable. Camera exposure/Bloom are owned by `assets/atmosphere/grade.ts`; fog extinction by `assets/atmosphere/fog-zones.json`. Backups: `.assetlib/staging/before-v5-tuning/`. Evidence: `artifacts/v5-tuning/`.

## V6 furniture and lens pass

Author source is now `/Users/arkliang/WorkBuddy/2026-10-27-19-13-32/cyberpunk_bar/cyberpunk_bar_v6.blend`, generated by adjacent `make_cyberpunk_bar_v6.py`. V4/V5 originals are unchanged. The runtime asset keeps its historical `Cyberpunk_Bar_V4.glb` name and sidecar/GUIDs.

Social seating changes from 30 repetitive high-top tables to 12 mixed tables with dining chairs, limited high stools and a banquette. Front booths become three large islands. Bar stools are grouped into 27 seats with gaps; the upper lounge has three conversation groups and two rail benches. Main crossing aisles are 1.8 m wide. The FPS lens now preserves 84 degrees horizontally instead of incorrectly using 84 degrees vertically; eye height remains about 1.6 m. V5 exposure/fog and Space jump are preserved.

35 tests, typecheck, asset verify and build passed. Native hardware-browser verification passed at revision `6e7ebe1a-7507-41ae-b043-a5a48b8ee862` with zero console/page errors; `artifacts/v6-layout/runtime-qa.png` was viewed. The delivered static build was separately walked in user Chrome from entry through social seating to the performance area. See `social-qa.png` and `manual-qa.json` in the same directory.

## V7 first-person scale calibration

Current author source: `/Users/arkliang/WorkBuddy/2026-10-27-19-13-32/cyberpunk_bar/cyberpunk_bar_v7.blend` and adjacent `make_cyberpunk_bar_v7.py`. V6 seating counts/layout are retained. A four-top is 1.70 × 0.95 m, top +0.75 m; dining chairs have a +0.47 m seat, padded 80 mm cushion and 90 mm back. Overall chair bounds are about 0.58 × 0.55 × 1.06 m. Other furniture and props receive a corresponding volume pass. Source V4/V5/V6 are preserved; the runtime GLB retains its V4 filename for stable asset identity.

The glTF camera had imported `autoAspect:false` and fixed 16:9 aspect. At non-16:9 windows this compressed objects horizontally. The player owner now explicitly enables autoAspect and starts with the actual drawing-buffer aspect; cleanup restores original settings. Native readback confirms aspect 1.362608075 vs drawing-buffer ratio 1.362608117, horizontal FOV 83.999996 degrees, eye height 1.5999996 m, and imported X/Z world scales within 0.99999994–1.00000015. Evidence: `artifacts/v7-scale/runtime-scale-final.json`.

Calibration is off by default. C toggles a 1 m ruler and 1.75 m adult reference; while enabled, 1/2 place the actual player at the 1 m / 2 m table-edge presets. They use the normal capsule, ground collision and camera. The references are hidden in the final user view. Actual Chrome screenshots: `first-person-1m-final.png`, `first-person-2m-final.png`, `first-person-clean-final.png` under `artifacts/v7-scale/`.

44 tests, typecheck, asset verify, project check and final CLI build pass. Hardware-browser dev verify passes at revision `dbcb9aa3-341b-452d-b077-403ca4658ce1`, zero console/page errors. Final dist was reloaded in user Chrome, both calibration views observed, then references hidden and walking/jumping checked. No performance benchmark or physical mouse-look requalification is claimed.
