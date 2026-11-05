# Cyberpunk PDR — D094 工程与单文件 HTML

2026-11-04。ForgeaX 0.4.18，沿用 019 的隔离渲染扩展。上一版归档可从 Git 提交 `46e8cee6` 取回。

## 打开场景

通过 Git LFS 获取完整的 `Deliverables/Cyberpunk-PDR.html`（145,381,690 字节，156 项嵌入资源）。在本目录运行 `python3 serve-html.py`，用支持 WebGPU 的桌面 Chrome 打开打印的地址，点击「进入场景」并让页面保持在前台。地址末尾添加 `?view=stage` 可直接看舞台。

首次实测工作线程启动超过 30 秒。刷新后同一 HTML 正常出图，再次刷新也成功。已看到灯牌珊瑚橙光晕、第一人称入口和 193/193 碰撞就绪。验证使用本机 HTTP，未验收直接打开文件或其他机器。WASD 移动、点击场景锁定鼠标、Esc 释放、Space 跳跃、R 回门口、1–9 机位、J 扰动液面。

## 本次内容

- 使用 ForgeaX 官方标志及牌面发光，珊瑚橙光晕溢出轮廓，两个藏在牌后的短程灯照亮近侧墙砖。字槽保持可读，牌面中心是浅桃橙。
- 顶棚灯带增强，前厅和舞池以粉紫为底，珊瑚橙集中在舞台。二楼四间包房改用原灯具位置的短程下照。全馆 32 灯。
- 当前官方标志的可编辑文件见 `Engine_Optics_019/artwork/D080-brighter-official/`，官方 SVG 与原版 Blender 源在同层 D077。D069 及此前的舞台设计源作为历史保留。
- 三张舞台预览实拍、光晕对比和单文件核验位于 `Engine_Optics_019/evidence/`。截图中的独立预览构建与打包构建分别标记。

单 HTML SHA-256 `a27a9dbc373745ed09e16db2cc31cae762f6a560e7d33c363b6f19ca9a903ff6`，包内构建指纹 `c1c002f6c2e1cb0f19a54ed46e783017eae6d8eeb849a701f4fdec9ab9889529`，着色器指纹 `632f519b9dcd1d28fe1a5a8a5b2f3eccf7667216f896ccab4811bcfad332adba`。

## 继续编辑与SDK恢复

`Engine_Workspace/afterlife-engine/` 归档的是 **019/game最新作者源**，forge.json/GUID为唯一入口。原53664工作副本在生产机器保留，旧归档用Git历史恢复。

只安装官方0.4.18后直接构建会丢失本次核心修复。`Engine_Optics_019/SDK_Overrides/` 保10份改动Render源、真实source-build的19个ES模块、改动TAA WGSL和原许可证；`SDK_OVERRIDES.json`记录原/新SHA。使用已安装的 **独立完整、依赖链接不逃逸的0.4.18 SDK副本**：

```sh
node Engine_Optics_019/apply-sdk-overrides.mjs --verify-only
node Engine_Optics_019/apply-sdk-overrides.mjs --sdk /absolute/path/to/independent/engine
```

工具先核整个覆盖包，拒绝原安装目录、pnpm包存储、未知基线和逃逸链接；先备份原字节。此工具不安装SDK或重连场景依赖。然后按SDK正常project init/依赖配置，将游戏 `@forgeax/engine` 指向该独立副本。生产环境Node22.22.3、pnpm12.10.1。使用同副本CLI构建/预览，并设置 `FORGEAX_ENGINE_SHADER_SOURCE_BUILD=1`，否则可能退回预编译旧shader。未声称新机器完整恢复验收。

`build-local-render.mjs` 是生产时的原生源码重建脚本，约定同目录sdk/engine副本；预编译覆盖ES模块已经保存，无需为打开HTML重编。`Engine_Optics_019/tooling/devkit-single-html-fix/dist/cli.mjs` 是同一修复官方打包工具，其node_modules必须链接到同一独立SDK的node_modules，再执行：

```sh
FORGEAX_ENGINE_SHADER_SOURCE_BUILD=1 node Engine_Optics_019/tooling/devkit-single-html-fix/dist/cli.mjs project package --root Engine_Workspace/afterlife-engine --format single-html --output /absolute/path/Cyberpunk-PDR.html --json
```

首次旧工具依赖实际造成旧TAA包，已拒绝发布；不要只看“导出成功”。014中同工具源补丁/SystemJS许可证继续保留。

## 归档边界

完整酒液介质栈、动态焦散、掠射宽高光与全场光学验收仍开放。归档不包含依赖存储、构建缓存或历史大回滚。保留可恢复的 SDK 覆盖源和编译模块。源文件映射见 SNAPSHOT_MANIFEST.json，文件校验见 SHA256SUMS。
