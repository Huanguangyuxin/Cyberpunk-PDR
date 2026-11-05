#!/usr/bin/env python3
"""Refresh only the authorized Cyberpunk archive, with isolated SDK deltas."""
from pathlib import Path
import hashlib
import json
import shutil

project = Path(__file__).resolve().parent.parent
optics = project / "Engine_Optics_019"
snapshot = project.parent / "UGit_Upload/forgeax-cedar-forest/Cyberpunk-PDR-2026-11-02"
copied = {}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def copy(source, relative):
    dest = snapshot / relative
    if source.is_symlink() or not source.is_file():
        raise ValueError(f"Not an ordinary file: {source}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists() or digest(source) != digest(dest):
        shutil.copy2(source, dest)
    assert digest(source) == digest(dest), relative
    copied[str(relative)] = {"path": str(relative), "source": str(source.relative_to(project)),
                             "bytes": dest.stat().st_size, "sha256": digest(dest)}


def tree(source, relative):
    skip = {"node_modules", ".forgeax", ".forgeax-debug", ".assetlib", "dist", "release",
            "__pycache__", ".git", ".agents", ".claude", ".cursor", ".codebuddy", ".workbuddy"}
    for item in sorted(source.rglob("*")):
        sub = item.relative_to(source)
        if item.is_symlink() or not item.is_file() or any(p in skip for p in sub.parts):
            continue
        if item.name in {".DS_Store", ".env"} or item.name.startswith(".env.") or item.suffix in {".blend1", ".pyc"}:
            continue
        copy(item, Path(relative) / sub)


# The existing author-project path becomes the current isolated game snapshot.
# Old unused assets remain recoverable and do not replace forge.json authority.
tree(optics / "game", "Engine_Workspace/afterlife-engine")
tree(project / "docs", "docs")
copy(project / "AGENTS.md", "AGENTS.md")
for name in ["TASK.md", "BASELINE.json", "build-local-render.mjs", "check-layer-routing.mjs",
             "check-display-order.mjs", "check-taa-shader.mjs", "capture-optics.mjs", "apply-sdk-overrides.mjs"]:
    copy(optics / name, Path("Engine_Optics_019") / name)

wb = project / "Production_WorkBuddy_020"
for name in ["TASK.md", "USER_CHANGE_04_BUILD_WEDGE_A.md",
             "source/WB020_stage_led_wedge_A.blend", "exports/WB020_STAGE_LED_WEDGE_A.glb",
             "design/wordmark/tiangong_A_wedge.svg", "design/integration-map-wedge-A.json"]:
    copy(wb / name, Path("Production_WorkBuddy_020") / name)
for group in ["scripts", "logs", "renders"]:
    for item in sorted((wb / group).iterdir()):
        if item.is_file() and (item.name.startswith(("s60", "s65", "s66", "wedgeA", "wedge-A"))):
            copy(item, Path("Production_WorkBuddy_020") / group / item.name)

# Include all actually changed core sources and the exact compiled ES modules.
baseline = json.loads((optics / "BASELINE.json").read_text())
original_sdk = Path(baseline["originalSdk"])
local_sdk = optics / "sdk/engine"
overrides = []
native = json.loads((optics / "evidence/D066-native-source-manifest.json").read_text())
paths = [Path("node_modules/@forgeax/engine-render/src") / row["file"] for row in native["changed"]]
paths += [Path("node_modules/@forgeax/engine-shader/src/taa-resolve.wgsl")]
build = json.loads((optics / "evidence/render-build.json").read_text())
paths += [Path(name).relative_to("sdk/engine") for name in build["metafile"]["outputs"] if name.endswith(".mjs")]
for relative in paths:
    source = local_sdk / relative
    stored = Path("Engine_Optics_019/SDK_Overrides") / relative.relative_to("node_modules/@forgeax")
    copy(source, stored)
    old = original_sdk / relative
    overrides.append({"path": relative.as_posix(), "stored": str(stored.relative_to("Engine_Optics_019")),
                      "bytes": source.stat().st_size, "sha256": digest(source),
                      "originalSha256": digest(old) if old.is_file() else None})
for pkg in ["engine-render", "engine-shader"]:
    for name in ["LICENSE", "NOTICE", "package.json"]:
        src = local_sdk / "node_modules/@forgeax" / pkg / name
        if src.is_file():
            copy(src, Path("Engine_Optics_019/SDK_Overrides") / pkg / name)
manifest = {"baseVersion": "0.4.18", "classification": "User-authorized local extension; not official SDK release",
            "protectedOriginalSdkAtCapture": str(original_sdk), "files": overrides}
(snapshot / "Engine_Optics_019/SDK_OVERRIDES.json").write_text(json.dumps(manifest, indent=2) + "\n")

for name in ["D066-native-source-manifest.json", "D066-native-render.patch", "D066-current-receipt.json",
             "D066-imported-geometry-check.json", "D068-taa-shading-reactivity.patch", "D068-published-taa-check.json",
             "D068-target-geometry.json", "D068-taa-naga.json", "D068-taa-naga.log", "render-build.json",
             "D069-package-local.json", "D069-package-local.stderr", "D069-package-verification.json", "D069-html-open.json"]:
    copy(optics / "evidence" / name, Path("Engine_Optics_019/evidence") / name)
for name in ["D068-sweep-reactive", "D068-static-reactive", "D068-shadow-off-reactive", "D068-normal-neon"]:
    for f in sorted((optics / "evidence" / name).iterdir()):
        if f.is_file() and not f.name.startswith("warmup"):
            copy(f, Path("Engine_Optics_019/evidence") / name / f.name)

# Keep the proven fixed package CLI, bound to a restored independent SDK by its
# documented node_modules link, rather than copying an entire dependency store.
tool = optics / "tooling/devkit-single-html-fix"
for f in sorted(tool.rglob("*")):
    if f.is_file() and not f.is_symlink() and "node_modules" not in f.relative_to(tool).parts:
        copy(f, Path("Engine_Optics_019/tooling/devkit-single-html-fix") / f.relative_to(tool))
for name in ["Cyberpunk-PDR.html", "Cyberpunk-PDR.html.sha256"]:
    copy(project / "Deliverables" / name, Path("Deliverables") / name)
copy(Path(__file__), "Runtime_Integration_014/prepare_ugit_D069.py")

package = json.loads((optics / "evidence/D069-package-local.json").read_text())["value"]
assert digest(snapshot / "Deliverables/Cyberpunk-PDR.html") == package["html"]["sha256"]
release = {"schemaVersion": 2, "snapshot": snapshot.name, "update": "D069",
           "engine": "ForgeaX0.4.18 + isolated local native extension",
           "previousUploadedCommit": "2cb2e09bca237f6ab8f9e224e20efe3e36854749",
           "deliveryState": "Packaged working candidate; limited visual checks, not final global optics acceptance",
           "htmlSha256": package["html"]["sha256"], "distManifestSha256": package["distManifestSha256"],
           "sourceMapping": {"Engine_Workspace/afterlife-engine": "Engine_Optics_019/game"},
           "filesCopiedByteForByteThisUpdate": sorted(copied.values(), key=lambda x: x["path"])}
(snapshot / "SNAPSHOT_MANIFEST.json").write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n")
# Includes retained historical files and generated release instructions too.
files = [f for f in sorted(snapshot.rglob("*")) if f.is_file() and not f.is_symlink() and f.name != "SHA256SUMS"]
(snapshot / "SHA256SUMS").write_text("\n".join(f"{digest(f)}  {f.relative_to(snapshot).as_posix()}" for f in files) + "\n")
print(json.dumps({"updatedRoot": str(snapshot), "copied": len(copied), "allFiles": len(files) + 1,
                  "sdkOverrides": len(overrides), "html": package["html"]}, ensure_ascii=False))
