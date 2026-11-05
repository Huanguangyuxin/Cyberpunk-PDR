# WB017 后处理精调 — 接入说明（D054）

作者/执行：WorkBuddy，模型显示名 Claude-Opus-5.5（UI 名，未核底层 API id）。本目录仅含参数与说明；**未启动 Engine、未 build、未改 dist/SDK/Pack**。下列效果全部 **待验证**，需 Codex 串行合入后用真实 Engine 画面核实。

## 只改的 4 组数（其余全不动）

| 组件 / 接入点 | 字段 | 现值 → 新值 | 理由（依据 0.4.18 公开源码） |
|---|---|---|---|
| Camera（`setArtPost` 与相机初始 set） | bloomIntensity | .06 → **.07** | 门槛提高后略补，霓虹仍有光晕；有效增益 ≈ .07×2.936 |
| | bloomThreshold | 1.6 → **2.2** | 场景线性亮度、曝光前。Spot 照亮的漫反射面留在门槛下 → Bloom 不再“补场景光”；霓虹(20–28)/顶棚灯带(5–6)仍远超 |
| | bloomSmoothWidth | .15 → **.6** | smoothstep 过渡 1.6–1.75 太硬，铬件/玻璃/细栏杆高光随 TAA 抖动和移动进出门槛 → 闪烁；改 2.2–2.8 渐入 |
| | bloomRadius | .22 → **.08** | 五级权重 mix(w,1.2−w,r)：最宽两级占比 28.8%→23.2%，最细级 27.5%→31.2%；光晕贴合灯管形体，减“奶雾糊满” |
| AmbientOcclusion（GTAO，pack） | thickness | 1(默认) → **.35** | 视空间 Z 剔除距离；1 m 时细栏杆/椅腿/凳杆会压暗身后 1 m 内表面，形成黑晕 = “接触过黑”主因 |
| | distanceExponent | 1 → **1.5** | 24 个候选更集中在近处：脚底/底座接触更清晰，远处少抬灰 |
| ScreenSpaceReflection（`pdr-wet-floor.ts` setSSR 两个分支） | thickness | .16 → **.10** | 减少细物体背后的伪命中拉丝，修反射边缘破损（Three r184 默认 .1） |
| | maxRoughness | .7 → **.52** | 湿地粗糙度 .09–.115 保 SSR；干前厅 ≥.58（D051）退回 Probe/IBL，前厅不出模糊 SSR 光泽、更“干”，该区 SSR 提前拒绝 |

不变：ACES(4)、手动曝光 .60、TAA、GTAO 算法/quality medium(24 候选)/radius .3/intensity .8/directLightingStrength 0/resolutionScale .5、SSR maxDistance 24、两个 ReflectionProbe、32 原生灯、1600×900 内部上限、布局/二楼/桌椅/六凳/第一人称、干燥前厅—湿雾深厅。
注：`whitePoint` 在 ACES 下为惰性字段（`mapTone` 只在 reinhard-extended 读取），保留原值即可，不要据此调色。

## 运动清晰度（TAA 无公开权重/锐化参数）

在 R 回门口、N 楼梯、`view=` 书签、1–9 机位这类**瞬移**后，对该相机写 `Camera.historyVersion = nextHistoryVersion(旧值)`，切断旧位置历史，消除跳点后的拖影；正常行走/环视不动历史。接入点：`applyBookmark`、`enterEntrance` 中设置 Transform 之后。

## 接入示例（Codex 串行改，WorkBuddy 不写 Engine）

```ts
import { CAMERA_BLOOM, GTAO, SSR, nextHistoryVersion, validatePostProfile } from '<017>/post-profile';
// 先复制到 Engine/assets 再 import；或直接把数值抄入现有三处
if (validatePostProfile().length) throw new Error('post-profile out of range');
// pack 相机初始化：保留原 tonemap/exposure/antialias，只把 bloom 四项换成 CAMERA_BLOOM
// artPost = {bloomIntensity: CAMERA_BLOOM.bloomIntensity, bloomThreshold: CAMERA_BLOOM.bloomThreshold, bloomSmoothWidth: CAMERA_BLOOM.bloomSmoothWidth}
//   并在 setArtPost 的 world.set 中补 bloomRadius: CAMERA_BLOOM.bloomRadius
// AmbientOcclusion: data: GTAO          （algorithm 1 = gtao，非 SSAO）
// wet-floor setSSR: {maxDistance: SSR.maxDistance, thickness: SSR.thickness, maxRoughness: SSR.maxRoughness}
// 瞬移后: world.set(cam, Camera, {historyVersion: nextHistoryVersion(world.get(cam, Camera).unwrap().historyVersion)})
```

## 代价

- Bloom：固定 11 pass / 11 目标，改数不改开销。
- GTAO：quality 与 resolutionScale 不变 → 开销不变（半分辨率 24 候选）。
- SSR：maxDistance 不变；maxRoughness 降低使干前厅像素提前拒绝，预计不增反减（**未测**）。
- historyVersion：每次瞬移只清一次历史，无新增 pass。

## FPS 持续 <10 时（按顺序逐级，不一键全关；ACES/TAA 始终保留）

T1 SSR maxDistance 24→16；T2 GTAO quality medium→low（24→12 候选）；T3 GTAO resolutionScale .5→.35。均在 `LOW_FPS_TIERS`。D052 实拍 HUD 约 24–30 FPS，目前无低于 10 的证据，故默认不启用。

## 合入后需看（全部待验证，不另起报告循环）

V1 舞台/门口：霓虹核心外保留粉紫色带，光晕贴形，被照地面不发光。V2 桌椅/吧凳/卡座：接触暗而不黑，细栏杆/椅腿后无黑环。V3 深厅 z −44..−22 及过渡带 z −29..−22：湿反射连续不拉丝、无硬 SSR 截断线，前厅看起来是干的；若出现截断线，maxRoughness 退到 .60。V4 行走+环视+R/view= 跳点：跳后无残影、细线不更闪、HUD 持续 ≥10 FPS。

非本模块范围：霓虹白芯主要来自自发光强度×曝光经 ACES 逐通道压缩，Bloom 不能也不应修；如需修应在材质 emission 侧，由 Codex 决定。SSR/Probe 是屏幕空间与局部探针，不是硬件光追。
