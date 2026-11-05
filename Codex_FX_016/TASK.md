# Codex016：高空喷散回落水雾

## D059当前（2026-11-02，实际迭代已交付）

Codex完成本轮液面透明/液深/缓慢起伏与原生顶灯移动高光，WB018 Opus5.5真实Blender候选已由Codex接入。读PROGRESS最上D059及014/evidence/D059-current-receipt.json：当前build manifest3ec38e2b…f91f7d，入口localhost53664，liquid-top看透明液深，liquid-light看真实光斑随波运动。真实GIF使用预热后6帧原采样时差，无插帧。32灯/曝光/布局/干燥前厅保持；非CFD/完整多层折射/焦散/硬件RT或整体美术验收。后续不得把旧D057 HTML/Ugit快照当本轮新源；不自动重包上传。无新独审/AB/路线回归循环，实际边界和失败证据保留。

## D053/D054 current entry (2026-11-02)

Codex owns real liquid transparency/depth/flow and Engine integration. Candidate A native Standard depth optics remains pink/flat; C explicit external normal also failed visually. Candidate B native single-layer medium made liquid nearly invisible; keep all source/build/images. Do not treat its absent dynamic-input publisher as proven root cause: native optional-input semantics still need diagnosis. Current D candidate uses documented Standard diffuse-energy split with a black diffuse-transmission tint to eliminate the clear-liquid diffuse lobe while preserving specular interface and native Beer/backdrop transmission; actual native images decide usefulness. No SDK edits, no CFD/multilayer/caustics claim.

D054 explicitly overrides old “no WorkBuddy” text for post-processing only: original task actually resumed in cua_repl with UI Claude-Opus-5.5, writes017 only. Read its actual module/receipt when ready; Codex serial merge into Engine. No second Engine/HMR owner, no extra report/regression loops, preserve D051 dry foyer and all other layout/control/light budgets. See latest PROGRESS for real build/capture state.

## D052 current entry (2026-10-31)

Latest delivery: isolated real Blender5.2.3 library source/d052/hero-glass.blend and formally imported Engine PDR_Hero_Glass_D052.glb; five original-size closed glass profiles with real micro-rounded lips/base, UV/smooth normals/tangents exported. Cooked native Surface/Material/GUID reflection-only Fresnel shell on drink containers; closed liquid m1/m2/m3 volume-preserving deformation retained. Shell has no exterior refraction/caustics; not full multilayer optics. Production, import and native source are Codex, not Gemini/WorkBuddy.

D051 overrides old global-domain instructions below: foyer/entrance nearly fog-free and dry, smooth transition z=-29..-22 to deep wet/mist. Keep18 table chairs/2 sweeping nativeSpot fixtures, latest upper floor/human/6stools/32lights. Own-app fixed bookmark links view=drinks/stage/chairs support real native pictures. Official build/preview replaces unstable devHMR. No WorkBuddy/Cursor resume, no SDK edits, no additional test/review loops; actual status and evidence at PROGRESS D052 and014/evidence/D052-built.


## D050 current entry (2026-10-31)

Continue native3D droplets and nearby closed-liquid surface motion on D049/D048. Actual Blender templates/source/export are in source/d050, exports/d050, logs/d050; official import PDR_Fluids_D050_e14010f1. Read PROGRESS D050 for live status; no new WorkBuddy/Cursor dispatch. Native motion is gravity/drag/wind droplets and pinned small gravity/capillary liquid modes, not two-phase CFD or caustics. Existing scene layout/human/32lights retained. Source014 owns runtime. Browser use disabled in Work settings; do not bypass. User no-extra-regression/review preference retained; necessary compile/start and actual images only.

## D049当前入口（2026-10-31）

D048上层已接入实际bcf6514f，当前继续Codex雾/湿地与原生后处理。主公共域已按pdr-atmosphere-domain共享米制mask连接前厅/桥下/深厅/吧前通道；主3D密度5源复用真实现有灯。两局部源改用发射年龄+上升减速/扩张/漂移/回落的三维光学近似，不冒称水滴CFD，旧R06未通过版本保留。GTAO/TAA接原相机；不重开WorkBuddy/Cursor、不更改上层。当前实际状态看PROGRESS最新D049；保用户不追加重复测试/审查要求，以必要启动、实际图与运动展示交付。

## D047当前追加：雾区地板积湿反射

用户要求雾已有后继续做其覆盖地面水反射。Codex014在现有自研引擎接实际PBR湿区与SSR/Probe，保原地板几何、砖缝、干湿边界/破损及碰撞；WorkBuddy只上层。当前雾仍仅深厅，先完成同一实际footprint，不能擅写前厅已覆盖；全空场雾补全后同源扩展湿区。固定曝光真实干/湿、SSR OFF/ON、低斜视及移动验证，不能用金属度1、自发光/镜像贴图或AI图当水反射，不称硬件RT或流体求解。原32灯/人体/布局保持。014/rollback/D047-before是修改前恢复点。

## 最新实际恢复点（2026-10-30）

v2真实native c468df09/URL50712，source pdr-dance-floor-mist.ts含公开cyberpunk.mist.tuning资源，set/read/reset用于有界实测，默认flowSpeed1.15/background.045/cloudGain.38/extinction.055/lightIntensity400；按实际源码读值。两组全高光学域仍仅深厅z[-43,-22.5]，加两个未过局部R06域。D045-v2七图独立N01/N02未关：较轻色罩，明显可追踪流动仍不足。不可签完成。

重要范围纠正：实际IAB Digit5前厅有大片中央空地完全没覆盖，截图014/evidence/D045-v2-front-uncovered.png。ARCH_DANCE_FLOOR只是185㎡深厅饰面，前厅实际中央核心约188㎡。读015/validation/codex_supervision/s20_snapshot/review/fog-coverage-bounds.json及FOG_COVERAGE_NOTES.md，以真实门口、前厅、桥下和深厅连续空间做全域，不把标签名等同用户整个空场地。可按实际灯源分区相接，保全高与柔和边界，区分工作padding和实际mesh；不要改场景布局。

下步先单owner、通过公开资源把全域background/cloudGain设0作零密度GPU对照，确认运行时纹理更新与渲染读取，再选择更容易追踪的横穿视线/竖向卷散及低遮蔽参数。不要只因CPU hash或A/B非零就通过；采样连续实际UI帧可按真实时差编码动图，无插帧/不加速，标注采样录屏身份。最终恢复animate=true、真实用户页reload/键鼠与多高度视图。R06喷口烟云/平顶/回落另待重做，不能退回静态低雾。当前WorkBuddy仅二楼已用户D046恢复，禁止给其雾任务或占共享Blender。

最新D045：雾须在整个中央空场地三维空间较均匀分布并持续流动，取消低位Gaussian雾层/人工平顶。D044低位源保留exports/history/D044失败身份。全域高度边界延伸到当前6.8/计划8.6屋盖之外，建筑遮挡限定可见空间，不使用人为水平截面。R06局部喷口烟云/平顶/回落未过，弱化实验贡献并另做，不伪称全水滴实现。实际全高度、多时间、斜视及灯OFFON检查才能关闭。

最新D044：覆盖整个实际中央开放舞池并有持续流动，不能只局限舞台前8m。先核真实边界；近/中/远、多时刻、斜视验覆盖和流向。局部Mantaflow缓存不可简单拉伸冒称全域流体，允许与明确标注的全域密度传输近似结合。R06当前只有局部升散候选，尚未满足D044。

依据D042/D043，由Codex实际制作，WorkBuddy只做二楼。先读项目AGENTS、DECISIONS D042/043、PROGRESS及当前Engine规则。只写本016的独立DCC/缓存/验证/素材；014可串行集成现Engine，015生产源只读。原R8空间可只读参考；新上层269464d8未接入，未来以验收后GLB同坐标合并。

先实际观看B站蒸汽/流体与体积雾教程，明确观看片段和作者/来源，结合Blender官方契约。制作两侧真实喷口、高处扩散与回落的Blender可编辑模拟/多时刻预览；避免稳定锥体和仅两条贴地亮带。颗粒运动、连续密度受光和局部湿地反射分别验证。使用Blender5.2.3已验证CLI的独立进程/文件，不占共享会话，不复制品牌、不装不明插件。

实际缓存可否导入ForgeaX须实查：现公开3D TextureAsset+VolumetricFog已运行2owner/4pass，支持动态密度，但不是VDB/Mantaflow直接导入或实时流体求解的证明。明确离线缓存、粒子轨迹及实时近似的归因，最终自研Engine多时刻/多视角和灯OFF/ON为验收依据。32原生灯、1.75m人体/1.64m眼、主要通路及原建筑保持。失败和半成品留存，不能用离线图冒充引擎画面。
