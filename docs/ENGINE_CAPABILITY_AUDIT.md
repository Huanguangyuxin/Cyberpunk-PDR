# 自研引擎接口审计 — 2026-10-28

执行者：Codex engine_audit 子代理（不是 Cursor Gemini）。范围：只读查看现有项目、SDK 文档与源码，调用 CLI help/status，解析当前 GLB 元数据。不改引擎、场景或资产，不启动 ForgeaX 专有 closed loop，不启动游戏，不做渲染验收。

## 证据等级与实际结论

本文区分：D＝文档声明；S＝源码/作者文件存在；C＝本轮 CLI 实际返回；R＝真实引擎像素/运行结果。本轮有 D/S/C，**没有 R**。README 的历史验收记录没有在本轮复验，不能作为本次 PDR 已完成的依据。

C：固定工具链 `/Users/arkliang/.local/share/forgeax-toolchain/engine-0.4.18-bin/` 的 Node/pnpm 可以运行项目本地 `pnpm exec forgeax`。`help --tree --json`、六个具体 help、`dev status` 和 `project engine status` 均退出0。实际 `dev status` 为 `phase: stopped`；Engine status 是 SDK 模式、binding 为 null、resolved version 为0.4.18。未启动或停止任何已有运行。

原始命令、退出状态、stdout/stderr 已保存到 `../evidence/engine-audit/`：`help.json`、`help-dev-capture.json`、`help-dev-status.json`、`help-dev-camera-set.json`、`help-dev-eval.json`、`help-profile-capture.json`、`help-rhi-timing.json`、`dev-status.json`、`project-engine-status.json`。

## 当前项目身份与入口

项目目录：`../Engine_Workspace/afterlife-engine/`。`package.json` 锁定 `@forgeax/engine: 0.4.18`；安装包 package.json 也实际为0.4.18。`forge.json` 的 schemaVersion 是3.0.0，唯一 engine root GUID 是 `697b2c2d-e7e0-5c54-9035-108555f9ad59`，没有显式 frontend/host/build root。

`assets/afterlife.pack.ts` 是当前作者入口，engine root 挂载 physics 和 scene，scene 通过 AssetRegistry 加载 `01a18078-9d28-7efe-9848-e32304ede0f5`，并挂载第一人称控制、atmosphere 和 neon。GLB sidecar 将该 scene GUID 对应到 `scene:CyberpunkBar_V4`。资产身份沿 GUID 链保持；不能把文件名当模型版本。

重大历史差异：README 当前声明的实际作者源已经是外部 WorkBuddy V7，场地56×36m、12m高、22×10m舞台、二层+5.6m，而项目长期规范继承 V3 的40×28m、10.8m、16×8m舞台、二层+5.2m。现有工程是历史实验/接口参考，不能不经决策直接把 V7 尺度带入新设计。外部 .blend 是否存在、其内容及权利来源本轮未核验。

现有第一人称走动、跳跃、碰撞与校准组件属于旧实验。新 PDR 没有玩法要求，应由设计确认展示相机/漫游所需的最小控制；不能把旧控制、NPC或玩法自动列为新产品范围。

## 当前 GLB 实际检查（S）

只读解析 `assets/Cyberpunk_Bar_V4.glb` 的 JSON chunk：23,053,872 bytes，62 nodes、31 meshes、31 materials、6 textures、6 images、1 camera、30 punctual lights（13 point、17 spot、无directional）。SHA-256 与逐材质摘要保存在 `../evidence/engine-audit/current-glb-inspection.json`。

其 `extensionsUsed` 只有 `KHR_lights_punctual` 与 `KHR_materials_emissive_strength`；全部材质中 normalTexture 为0、metallicRoughnessTexture 为0；没有 KHR transmission/volume/IOR 扩展。因此：已有贴图/颜色和 roughness/metallic 标量并不能证明满足新的高保真表面细节、玻璃液体折射要求。GLB 中玻璃/水命名不代表实际折射启用。

GLB 相机含固定16:9与约0.97923rad vertical FOV；旧 first-person owner 存在 autoAspect/水平视角修正。新固定机位必须明确分辨率、FOV和相机转换，不能仅沿用导入值。

## 光照、阴影与容量（D/S，R未验证）

文档/源码入口：SDK `source/engine/packages/render/README.md`，源码 `render/src/components/spot-light.ts`、`point-light-shadow.ts`、`pipeline/standard-lighting/layout.ts`，项目安装技能 `skills/forgeax-engine-material/SKILL.md` 与 `forgeax-engine-render-pipeline/SKILL.md`。

- `PointLight`、`SpotLight`、`RectAreaLight`、`DirectionalLight` 存在；Transform 提供位置。Point/Spot intensity 是 candela、range 为米、color 为线性RGB；Spot innerConeDeg/outerConeDeg 为半角（度），方向从光源指向场景。必须设置有限 range 以控制局部光成本。
- `RectAreaLight` 有 width/height、sourceTexture/IES；可作为吧台面光的设计候选，但当前项目作者文件没有启用，未经本轮实测。
- Spot `castShadow` 默认 false；glTF bridge `source/engine/packages/gltf/src/bridge.ts` 的 convertLightPayload 对 spot 明确写 false。Point 阴影需要独立 `PointLightShadow`。当前作者 TS 中未找到这类显式阴影配置。**导入灯光不等于导入阴影。**
- Spot 源码注释描述4个投影阴影 atlas slot，确切 admission 和超额行为须在当前实际 renderer.inspect 与渲染中核实；不能给每盏舞台灯默认保证投影阴影。Point shadow 也有 shader capability 前置，必须查 inspect 状态。
- 旧 README 声称最多32盏局部光，但当前源码 `standard-lighting/layout.ts` 的 `MAX_LIGHTS = 256`，cluster grid 默认16×9×24。这是文档/源码冲突，不是已测容量。Lighting Bible 不应把32写成硬限制，也不能承诺256灯达标；先规划逻辑灯具与可独立开关的照明组，再根据当前编译产物、renderer.inspect和硬件成本确定同时活动数量。

## PBR、透明与折射（D/S，R未验证）

入口：`Materials.standard`、原生 MaterialAsset/Pack/GUID；图像/模型走 sidecar→importer/cooker→catalog。现有 neon 插件已用 `Materials.standard({baseColor,roughness,metallic,emissive,emissiveIntensity})` 创建受生命周期管理的材质；不能旁路手写 GPU shader artifact 或构建缓存。

引擎文档包含 normal/roughness/metallic 通道、clearcoat、sheen、anisotropy 等 optional static switches，和 transmission/IOR/thickness/attenuation。高保真拉丝钢/皮革/玻璃可以设计，但所有额外层须显式cook启用，不能认为普通 GLB 会自动补全。

Transmission 属于 Standard 单一渲染管线，读取 `renderer.inspect().transmission` 的能力与资源状态；共享采样槽存在纹理预算及冲突限制。需要确认资产导出扩展、alpha/BLEND条件、法线、厚度、背景采样、前后排序与粗糙折射。玻璃与酒液分成独立层/网格，先做引擎材质探针再批量生产。

颜色纹理使用 sRGB，normal/roughness/metallic/AO 等为线性数据；贴图打包、法线方向和UV按实际 importer 约定确认。现有GLB无法线和MR纹理，不能当作新 Material Bible 的完成样例。

## 局部反射（D/S，R未验证）

`ScreenSpaceReflection` 是 camera opt-in component，字段 maxDistance（默认1m）、thickness（0.1m）、maxRoughness（1）。文档规定 `renderer.inspect().ssr.status` 有 not-requested/requested/fallback-only/structural-only/admitted；admitted 仍需真实图像和有效反射工作证据。不能只添加组件便宣称 SSR 成功。

`ReflectionProbe` 带 halfExtents、priority、boxProjection、intensity、resolution（默认256）、updateIntent（once/on-change/continuous）、invalidationVersion。适合吧台/VIP局部环境候选；需验证 capture、材质选择和更新成本。

`PlanarReflection` 属于 display Camera，持有单独 sampled RenderTarget；可用平面/clipBias/updateIntervalFrames 设计窄水带反射。每个display camera最多一个 planar capture；无递归水反射，捕获内容有排除规则。不能承诺同时无成本覆盖全场镜面。

当前作者 TS/JSON 中未发现 SSR、ReflectionProbe、PlanarReflection 的明确启用。已有粗糙高光/环境反射不证明近景反射。项目设计应让干燥瓷砖保留宽高光，将清晰平面反射限定在水带或专门展示面，保留SSR关/开与离屏物体测试。

## 体积与动态效果（D/S，R未验证）

当前 `assets/atmosphere/atmosphere.plugin.ts` 已创建32³线性r8unorm 3D密度纹理，并按 `fog-zones.json` 建立局部 VolumetricFog，绑定最近的已导入 Point/Spot 光。其实际 sampling 是 noise；材质贴图本身不构成体积。

`VolumetricFog` 的 boundsMin/Max 是世界坐标，不被 Transform 再转换；extinction/albedo/emission 为RGB系数，anisotropy 在(-1,1)。源码 `volume/component.ts` 当前 owner上限11，文档解释为采样纹理预算；并不等于每灯各一套雾都能无限增加。质量profile有 low/high、depth48/64、tileSize4/16，实际成本与层数需 inspect/测量。

现有 neon Update 根据 Engine Time 改发光材质等级和Point/Spot强度，说明项目有可借鉴的动画组织方式。但名字匹配、绑定数量和实际闪烁必须实测，不能据代码宣布动态舞台效果完成。新的舞台运动、光束方向、粒子和雾要有明确组ID、时间种子和冻结控制；VFX编译/运行能力本轮未调用。

局部体积目前文档有不透明深度/透明合成边界，玻璃/雾与粒子叠加要专门检查；不能将雾层当遮挡错误补丁。

## HDR、曝光与后处理（D/S，R未验证）

当前 `assets/atmosphere/grade.ts` 真实配置：manual exposureMode0、exposure0.68、whitePoint4、Bloom intensity0.11/threshold1.6/smoothWidth0.4/radius0.22；atmosphere插件对导入 Camera 写入这些字段并设FXAA。读取当前camera是否启用bloom/tonemap仍需运行证据。

文档包含Camera tonemap/Bloom/FXAA/MSAA、SSAO、TAA等；不能把所有SDK能力视为本项目已启用。HDR线性场景与HDR显示输出是不同声明，目前没有本轮HDR显示验证。

Lighting Bible 应指定 Cinematic 和 Benchmark 的整套曝光、灯光、雾、反射、阴影、抗锯齿状态；Benchmark 固定曝光和时间，关闭自动适应/随机闪烁，但不得静默降低作为对比基线的效果质量。当前package.json的forgeax.metrics条目对fps/bench均禁用，不存在本次合格Benchmark。

## 固定机位、截图和诊断（C发现，R未执行）

本轮实际 help 已验证：`dev camera set` 接受revision、position、target等schema；`dev capture` 在确认submitted frame后采集持有页面；`dev eval` 要求code和revision。执行前必须从help完整schema取值，不靠示例猜输入。CLI临时观察机位不是持久化作者相机，正式设计要有相机ID/坐标/FOV/分辨率，再通过原生作者数据实现。

`dev capture` 的 output/checkpoint 由CLI定义；可用于真实引擎Beauty。还需真实UI/Canvas范围、提交帧、当前revision、错误日志和采集参数。保存图片路径不等于看过图片；必须打开像素检查。此轮没有任何新引擎截图。

`project capture` 文档有browser compositor/确定性capture路线，软件图可支持结构检查，但不能代替硬件性能或目标浏览器验收。线框/深度/normal诊断是否可通过当前host配置输出，尚未实测，不能先承诺最终诊断图。

## CPU/GPU Benchmark接口与解释边界（D/S/C发现，测量未做）

C：`help profile capture` 发现 bounded CPU profile 参数 frameLimit/eventLimit/revision/output；实际capture没执行。host须启用profiler，未启用应返回明确状态。CPU profiler覆盖App/Render边界，不是GPU计时。

D/S：GPU pass timing 默认关闭，需要现有Renderer创建选项 `gpuPassTiming: {}`；通过 `renderer.subscribe` 取得真实 `frame-submitted` receipt，再调用 `renderer.observe(receipt,{include:['timings']})`。区分 complete/partial/unavailable/failed；缺timestamp-query时不得填0或模拟GPU耗时。

C：`help rhi timing` 发现重放 GPU timing，输入artifact/digest；这是重放pass成本，不是当前完整应用帧延迟。不能把pass时间求和当GPU frame time；与CPU scope重叠需分开解释。

没有本轮实际CPU/GPU数据，也没有已冻结目标平台/性能阈值。建议提交固定机位、分辨率/DPR、灯组状态、种子、预热/采样窗口、硬件/浏览器/驱动和质量profile的Benchmark设计，待真实设备选定后实测，不提前承诺帧率。

## 供设计直接采用的边界

可直接作为设计契约：米制场景、线性灯色与有限range、Point/Spot灯组、PBR材质族、原生camera曝光/Bloom、全场固定机位、版本化参数、可关闭动态效果的Benchmark。实现仍需通过原生资产链。

可作为待验证候选：RectArea/IES、阴影atlas分配、SSR、box-projected probes、planar水带、transmission/IOR/厚度、可调体积质量、粒子和GPU timing。这些应在设计图中显式标注“原生接口已发现，当前场景未验证”，附替代呈现方案及质量影响；不能宣称原生高级能力已成功启用。

禁止以贴图假镜面或离线渲染弥补缺证据并称原生效果。若实际引擎能力不满足目标，先保留缺口和证据，交总控处理；未经批准不改核心架构、不更换引擎。

## 后续最小验证顺序（本轮未执行）

1. 由集成者选择当前源/质量profile，先project check与asset verify；不合格沿owner恢复，不擅自升级。
2. 用现有dev start的官方schema启动，保存revision/status/errors；在实际浏览器看图和捕获，不以HTTP成功作通过。
3. 读取原生inspect：已选pipeline、lights/阴影、transmission、SSR、probe、volumetricFog；将请求值/有效值/回退原因分列。
4. 设计批准后，用隔离单资产探针验证单位、朝向、PBR/玻璃、四类阴影和反射检查；只验证管线，不能变成Vertical Slice。
5. 启用真实有界CPU/GPU测量，并输出Cinematic/Benchmark模式差异和固定条件结果。性能和画质各自验收。


## 追加：历史工程真实硬件运行探针（2026-10-28）

本节更新前文“本轮没有R”的时间状态：现已对**历史 afterlife-engine / WorkBuddy V7 实验**取得一次真实运行、原生只读inspection和实际像素证据。不是新40×28m设计或新PDR运行/质量验收；不替代设计批准。操作者为Codex engine_audit，未经过Cursor Gemini，不能记为Gemini产出。

### 实际执行及清理

启动前 `dev status` 明确stopped；读取实际help schema后，在原项目固定工具链运行 `pnpm exec forgeax dev start --headless true --backend hardware --json`。60秒外层等待超时，stdout为空，失败事实保存于 `../evidence/engine-runtime-probe/dev-start-hardware.json`。随后一次只读status读到ready，说明持久owner继续完成启动；没有重复启动。实际revision为 `94e99ef4-223f-4cf3-ad7c-19cbb3f933c7`，私有浏览器URL曾为 `http://127.0.0.1:51326/`，该URL在停止后不再作为可用预览交付。

Owner报告Engine/Render/Kernels采用auto且均enabled；Engine worker running、world healthy，actual backend hardware/WebGPU，浏览器adapter apple metal-3。未触及本地reviewserver8774，没有操作Cursor或用户其他浏览器标签。

完成读数与截图后，执行自己启动owner的 `dev stop` 成功，最终 `dev status` 为stopped；证据 `dev-stop.json`、`status-after-stop.json`。没有安装、升级、改作者源/资产/核心；仅允许正常运行缓存和本目录日志。

### 截图与实际观察

通过原生 `dev capture --revision ... --output <绝对PNG>` 得到 `../evidence/engine-runtime-probe/historical-engine-probe.png`，1280×720，记录submitted frame1519；截图报告console0/page0、fatalError null。已用view_image打开并实际检查像素。

画面确实呈现旧夜总会3D场景、霓虹、吧台、桌椅、桁架与暗部；前景大柱/卡座遮挡视线，吧台与高光偏亮，家具材质细节和整场构图不足以接受为新高规格PDR。HUD的FPS42.9只是当时屏幕文字，**不是合格Benchmark或硬件GPU帧时测量**。

### Worker inspection的正确途径与保留失败

直接 `renderer.inspect()` 路径在当前Engine Worker eval中renderer不可用，首次只读返回renderer:null。随后查原生App README“Renderer inspection through public App eval”，确认官方路径 `return await execution.inspectRenderer();`。完整Result经CLI返回时发生 `script-result-unserializable`，原始失败保留在 `worker-renderer-inspect.json`；不能称完整inspection成功。

针对这次真实返回边界，改为仍调用同一个官方只读接口，但只选实际存在字段、在eval内JSON.stringify为字符串后返回，成功获得selected facts；函数值会明确标`[function omitted]`，BigInt会转字符串。没有换Renderer、启动第二图或改变执行位置。原始调用和选择字段脚本保存在 `worker-renderer-summary.json`、`worker-renderer-features.json` 与read-worker-renderer*.js。解析后的汇总为 `runtime-probe-summary.json`。

### 实际渲染事实（此历史revision）

- Pipeline为forgeax::standard、forward，PBR=true、IBL=true、SSAO=false。实际profile.lightCount32；standardLighting实际requested30/admitted30、shadowed0、maxLights32、compute-storage/GPU cluster producer。**前文源码MAX_LIGHTS256不证明当前已加载profile可接收256灯；此次真实profile上限是32。**新Lighting Bible需要依据加载profile单独资格化，不宜盲目采用源码常量。
- Directional shadow请求/有效均off、cascade0/writerPasses0；pointShadow unavailable、requested0/admitted0。shadowRaster passCount0/drawCount0。虽然perFramePassNames含spot-shadow，**pass名称本身不证明实际投影阴影绘制**。
- SSR为not-requested，lane forward、work passCount0；ReflectionProbe factCount/acceptedCount/activeCount均0、capture0，selection skylight、fallback neutral。没有资格化局部probe、SSR或平面反射。
- VolumetricFog ownerCount4，status available、resourceStage accepted、passCount4；memoryBytes60,368,256；selectedLight为spot且shadowTile−1。真实pipeline有volume-inject/integrate/temporal/composite。它证明旧场景的原生局部体积已被接纳并有画面，不证明新动态舞台体积、遮挡或透玻璃效果已通过。
- Bloom graph valid、enabled=true、state active、5 levels/11 passes；FXAA在post stages中。output中intermediate rgba16float、displayEncoded=true，effective sRGB；不代表HDR显示输出资格化。
- Transparency requested/resolved sorted、sortedDrawCount2；实际inspection availableKeys中没有transmission字段。因此前文文档中提及的inspect().transmission在此加载运行实例未能直接核实，不能据此宣称折射可用或已启用。
- capability timestampQuery=true、period1ns，仅说明设备能力；本轮没有请求GPU timing、CPU profile或严格Benchmark。rayQuery.supported=false，reason backend-has-no-ray-query，不能声称硬件光追能力。

### 之后如何复用

新设计/资产集成须先通过用户设计闸门。需要再次检查历史工程时，从该工程目录使用固定Node/pnpm工具链，先status，再按help的实际schema启动；重启会产生新revision，禁止复用上述revision。取Worker真实Renderer资料使用execution.inspectRenderer官方只读路径并保留序列化限制；截图必须capture后再打开像素。工具接通与有场景画面不代表全部高级渲染效果或新PDR已完成。
