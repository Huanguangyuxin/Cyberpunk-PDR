# WB018 对照丽姿酒吧的局部修复候选 — 收件说明

执行：WorkBuddy，模型显示名 Claude-Opus-5.5。只写本目录；用隔离的 Blender 5.2.3 CLI；没有启动 Engine，也没有改 014/016/015/017、参考、杯瓶液体或 SDK。**图片均为 Blender Cycles DCC 渲染，不是 Engine 画面**。Engine 效果待 Codex 串行接入后验证。

## 选定的 3 个差距（真实参考 → 当前 Engine D057 图）

| 差距 | 参考图/帧 | 当前问题 | 候选对象 |
|---|---|---|---|
| G1 顶棚 | R11、R12；视频帧 02m24s、02m42s、03m18s | 只有细直白管，缺少暗色吊顶块面上的折线/倒角宽灯带 | `WB018_CEIL_BAND_FRONT`：前厅倒角双条冷白灯带，装在暗色钢板吊顶框上，另有一段 Z 形折灯；吊杆经射线校核，挂到屋梁或屋面板，避开管线。`WB018_ROOF_LIGHT_BANDS_COOL`：深厅现有灯带换成冷白（原样网格，替换 FIX_ROOF_LIGHT_BANDS） |
| G2 座基灯线 | R11、R12；帧 01m12s、01m30s | 地面整片偏粉，缺少底座边缘的粉色灯线 | `WB018_BASE_LED_LINES`：4 根桥下立柱裙边 + 18 根柱子底部的粉色 LED 槽 |
| G3 墙面 | R12、R11；帧 01m12s、04m30s | 舞台两侧没有吸音编织板，也没有成对竖向粉色灯箱 | `WB018_STAGE_FLANK_PANELS`：北墙舞台两侧的原创吸音编织板（0.6 m 模数，纹理由脚本生成，另有 SVG 源）+ 每侧 2 个竖向粉色灯箱 |

灯光是纯参数候选，见 `design/light-param-candidate.json`，32 盏总数不变：
- **L13 移位：** 移到新灯带下方，改冷白，有现值、建议值和理由。
- **环境光（可选）：** 粉紫环境光改为同亮度的冷蓝。
- 发光件在 Engine 里不会照亮邻面，G1 的实际照明只靠 L13。

## 文件
- `scripts/`：可重跑的脚本。s01 探测 → s05 纹理 → s10 候选生成 → s20 前后渲染 → s30 选定对象导出。
- `source/club-wb018-candidates.blend`：完整场景副本加候选，可编辑。基线副本在 `source/baseline/`，失败版本在 `source/history/`。
- `exports/WB018_lizzie_candidates.glb`：只含 4 个 WB018 节点，不能当全场替换。
- `textures/`：M18_ACOUSTIC_WEAVE 的颜色、法线、ORM 贴图。`design/acoustic_weave.svg` 是可编辑源。
- `design/integration-map.json`：对象、材质、灯名映射，以及回滚方法。
- `renders/before`、`renders/after`：5 个固定机位，同一源、同一参数。`WB018_before_after_sheet.png` 是前后对照拼图。
- `logs/`：读取回执、各步日志和 SHA。

## 已知局限
- **深厅灯带：** 改冷白前后差别小，因为原紫色灯带色调映射后本来就接近白色。
- **底座接触：** 柱脚套环和立柱裙边灯线与原几何是有意贴合或包裹（BVH 显示接触面），不改通路。
- **吊杆：** 17 根吊杆中有 2 根因上方有管线、没有干净的锚固点而跳过。
- **视频截图失效：** `01-28-browser.png` 被 B 站登录弹窗挡住，改用 Engine 文档目录里的视频截帧。
