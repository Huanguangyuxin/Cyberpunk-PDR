# Cyberpunk PDR — D189

这是用 ForgeAX 0.5.0 制作的赛博朋克风格夜总会场景。D189 更新了墙面和地面贴图，保留发光舞台和分区灯控。主舞台与四间 VIP 包厢有旋转镜面球，主舞台灯光会循环换色。

## 打开场景

下载 [Cyberpunk-PDR.html](Deliverables/Cyberpunk-PDR.html)，再用支持 WebGPU 的桌面版 Chrome 打开。文件大小约 247 MB。用 Git 克隆时，安装 Git LFS 后运行 `git lfs pull --include="Deliverables/Cyberpunk-PDR.html"` 取得完整 HTML。

在桌面 Chrome 中，已经实测直接从文件离线出图、按 W 行走，以及刷新后重新进入。测试机器首次出图约 53 秒。WASD 移动，点击画面后用鼠标环视，Esc 释放鼠标，R 回入口。右上角的「灯光与画质」面板可调整灯光和渲染效果。

SHA-256 见 [校验文件](Deliverables/Cyberpunk-PDR.html.sha256)。

[舞台实拍](Deliverables/Progress_2026-11-16/01-main-stage.png) · [入口实拍](Deliverables/Progress_2026-11-16/02-entrance.png)

## 编辑工程

当前场景源在 [Engine_Workspace/afterlife-engine](Engine_Workspace/afterlife-engine)。用 Git LFS 取得该目录的资产，在目录中按 `package.json` 和 `pnpm-lock.yaml` 安装依赖。`forge.json` 是 ForgeAX 的项目入口。用预览脚本打开工程可编辑灯光、材质和布局。

此次归档包括 D189 的场景源、实际打包的运行文件和两张 Chrome 实拍。其他目录保存早期设计与技术资料。D094 可从提交 [afaf677](https://github.com/Huanguangyuxin/Cyberpunk-PDR/commit/afaf677504468e49a209b724eeadbeccecda63da) 取回。

[本版归档清单](SNAPSHOT_MANIFEST.json) · [文件摘要](SHA256SUMS)
