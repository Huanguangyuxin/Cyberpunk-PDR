#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Update only the existing Cyberpunk snapshot, preserving unrelated Git state."""
from pathlib import Path
import hashlib
import json
import shutil

project = Path(__file__).resolve().parent.parent
repo = project.parent / "UGit_Upload/forgeax-cedar-forest"
snapshot = repo / "Cyberpunk-PDR-2026-11-02"
old = json.loads((snapshot / "SNAPSHOT_MANIFEST.json").read_text())
package = json.loads((project / "Runtime_Integration_014/evidence/D060-package.json").read_text())["value"]
copied = {}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy(relative):
    source, dest = project / relative, snapshot / relative
    if source.is_symlink() or not source.is_file():
        raise ValueError(f"Not an ordinary source file: {relative}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or digest(source) != digest(dest):
        shutil.copy2(source, dest)
    value = digest(source)
    if value != digest(dest):
        raise ValueError(f"Copy mismatch: {relative}")
    copied[relative] = {"path": relative, "bytes": dest.stat().st_size, "sha256": value}


def tree(relative):
    for source in sorted((project / relative).rglob("*")):
        if not source.is_file():
            continue
        sub = source.relative_to(project / relative)
        if any(x in {"__pycache__", "node_modules", "history", "baseline"} for x in sub.parts):
            continue
        if source.name == ".DS_Store" or source.suffix in {".blend1", ".pyc"}:
            continue
        copy(source.relative_to(project).as_posix())


# Retain the original upload's author closure and refresh its current bytes.
for item in old["filesCopiedByteForByte"]:
    copy(item["path"])
for directory in ["Engine_Workspace/afterlife-engine/assets", "docs",
                  "Production_WorkBuddy_018", "Deliverables/Progress_2026-11-02"]:
    tree(directory)
for relative in ["Codex_FX_016/TASK.md", "Production_WorkBuddy_017/post-profile.ts",
                 "Production_WorkBuddy_017/INTEGRATION.md",
                 "Runtime_Integration_014/prepare_ugit_D060.py",
                 "Runtime_Integration_014/capture-built-D059.mjs",
                 "Runtime_Integration_014/evidence/D059-current-receipt.json",
                 "Runtime_Integration_014/evidence/D060-package.json",
                 "Runtime_Integration_014/evidence/D060-html-open.json"]:
    copy(relative)

html = package["html"]
(snapshot / "README.md").write_text(f"""# Cyberpunk PDR — 当前工程、HTML与画面回顾

2026-11-02 D060更新；ForgeaX固定0.4.18。此目录沿用原归档，Git历史保留上一版，未修改仓库中的Cedar工程。

## 直接查看

先取得完整Git LFS文件。`Deliverables/Cyberpunk-PDR.html`为{html['bytes']}字节的单HTML，全部{package['embeddedAssets']}个资源已内置。SHA256：`{html['sha256']}`。

在本目录运行`python3 serve-html.py`，桌面Chrome打开打印的本机地址，点击“进入场景”，加载期间保持前台。精确新HTML在原Mac普通Chrome的HTTP方式已实际出图，HUD33FPS是单帧观察；file://直开未工具验证。点击画面后WASD移动、鼠标环视、Space跳跃、Esc释放鼠标、R回门口、1–9机位、J扰动液面。

本轮包括D059酒液透明/液深染色/真实网格波面/原生反光，以及WorkBuddy018对照丽姿生产的折线宽灯带、柱脚灯槽和舞台侧板。二楼独立VIP、既有玻璃、18把桌椅、六吧凳、干燥前厅/深厅湿雾与32灯限制保留。

## 真实画面

打开`Deliverables/Progress_2026-11-02/README.md`：4张真实静图+1实际采样GIF，附来源SHA与版本。没有AI补画、提亮或滤镜；D052椅子图明确为历史阶段，其余D059图片的构建身份仍为3ec38e2b…，不能冒充D060HTML的截图或严格AB。

新package构建manifest：`{package['distManifestSha256']}`。CLI重新构建，但9项D059作者源SHA与已运行源相同，详见`Runtime_Integration_014/evidence/D060-html-open.json`。

## 继续编辑

工程为`Engine_Workspace/afterlife-engine/`，`forge.json`是唯一入口，assets/GUID/source原字节保留。Node22.22.3、pnpm12.10.1；进入工程执行`pnpm install --frozen-lockfile`、`pnpm exec forgeax project build --target browser --json`、`pnpm exec forgeax project preview --port 53664 --json`。未声称在另一台机器重装验证。原.command可能有本机历史路径，跨机使用上述命令。

可编辑DCC源：`Production_WorkBuddy_015/source/club-workbuddy015-upper-final.blend`（二楼）、`Production_WorkBuddy_018/source/club-wb018-candidates.blend`（本轮装饰）、`Codex_FX_016/source/d050`（液体）、d051（桌椅/灯具）、d052（玻璃杯瓶）。Engine运行时材质、动态雾/液体/后处理在assets源码中，任一blend都不是全部Engine效果。

`Design/ACTIVE_PROTOTYPES`保冻结9图，`docs/PROGRESS.md`与DECISIONS保存真实状态/范围。镜面灯位酒液高光仍偏宽；完整多层折射/焦散/CFD/硬件RT不属于已完成项。SSR与Probe不是硬件RT；归档不是整体美术终验。

仍排除node_modules、DDC/.forgeax、dist、历史大回滚、第三方参考视频。隔离的官方单HTML修复源和SystemJS许可证保留于`Runtime_Integration_014/tooling/devkit-single-html-fix`，不改SDK核心。根仓库E盘规则针对原Windows工作树，本Mac归档未迁移该工程。

SNAPSHOT_MANIFEST.json记录来源与SHA，SHA256SUMS覆盖本目录。旧版本可从Git历史恢复。
""")
attributes = snapshot / ".gitattributes"
current = attributes.read_text()
if "*.gif filter=lfs" not in current:
    attributes.write_text(current + "*.gif filter=lfs diff=lfs merge=lfs -text\n")
manifest = {
    "schemaVersion": 1, "snapshot": snapshot.name, "update": "D060",
    "engine": "ForgeaX0.4.18", "deliveryState": "Current source and exact HTML archive; not final art acceptance",
    "htmlSha256": html["sha256"], "distManifestSha256": package["distManifestSha256"],
    "sourceRootAtCapture": str(project), "previousUploadedCommit": "eb5761a7e46abc1e60e8a9382375a2f728a92ef9",
    "filesCopiedByteForByte": sorted(copied.values(), key=lambda x: x["path"]),
}
(snapshot / "SNAPSHOT_MANIFEST.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
lines = [f"{digest(f)}  {f.relative_to(snapshot).as_posix()}" for f in sorted(snapshot.rglob("*"))
         if f.is_file() and f.name != "SHA256SUMS"]
(snapshot / "SHA256SUMS").write_text("\n".join(lines) + "\n")
print(json.dumps({"updatedRoot": str(snapshot), "copiedSources": len(copied),
                  "totalFiles": len(lines) + 1, "html": html}, ensure_ascii=False))
