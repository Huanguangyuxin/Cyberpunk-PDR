# Cyberpunk PDR · D189

2026-11-20 舞台与侧廊修订版。当前浏览器正式包位于 [dist](Engine_Workspace/afterlife-engine/dist)，包含 202 项已校验的运行资源。

克隆后运行下列命令，在支持 WebGPU 的桌面 Chrome 中打开 http://localhost:8000/ 。

```sh
git lfs pull
cd Engine_Workspace/afterlife-engine/dist
python3 -m http.server 8000 --bind 127.0.0.1
```

舞台正面机位为 `/?view=stage-front-elevation`，东西侧廊机位为 `/?view=stage-east-aisle` 和 `/?view=stage-west-aisle`。[查看参考图、实机对照和运行记录](Deliverables/D189-stage-aisle)

[可编辑场景源](Engine_Workspace/afterlife-engine/assets) · [Blender 制作源](Engine_Workspace/afterlife-engine/art-source) · [运行资源校验清单](Engine_Workspace/afterlife-engine/dist/forgeax-dist.json)

Deliverables 中的单文件 HTML 及根目录原有快照清单属于历史版本。
