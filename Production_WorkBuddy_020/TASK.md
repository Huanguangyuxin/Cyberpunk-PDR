# WB020 — 主舞台后方“天工引擎”LED字牌

用户最新明确要求你与Codex分工：你做舞台后方LED真实资产，Codex修渲染重叠闪烁/阴影并接入Bloom。本任务沿用原任务，保持实际Claude-Opus-5.5；不要恢复018其他装饰扩展、旧HTML或全场重建。

先读父项目AGENTS、docs/DECISIONS最新D063及以前D062、PROGRESS、ART_DIRECTION、SCALE_STANDARD；读当前Engine AGENTS/材质与导出相关技能。只写Production_WorkBuddy_020/。Engine_Optics_019（所有game/sdk/baseline/evidence）、Engine_Workspace、014/016、011/013/015/017/018、冻结9原型、References、UGit归档全部只读。使用独立Blender CLI，不能占共享Blender会话，不能启动Engine/HMR、修改引擎/后处理或让Codex原工作被覆盖。

真实基线：015/source/club-workbuddy015-upper-final.blend、Engine_Workspace/afterlife-engine/assets/Club_Upper_WB015_bcf6514f.glb；018导出的选定装饰已接入，当前stage图014/evidence/D059-final-stage/stage-1.png、整馆图D059-final-entrance/entrance-1.png。019是核心光学候选，不能修改它。实际查看这些图片以及已保存的丽姿原作R11/R12/视频帧，保粉紫局部照明/冷蓝暗场与工业地下气质。

交付一个可独立导入的舞台后方LED招牌，文字必须逐字为“天工引擎”（U+5929 U+5DE5 U+5F15 U+64CE），不加英文/错字/方框，不用AI图代文字。使用本机实际可用的中文字体并核字形，保可编辑文字设计源（SVG轮廓/矢量及字体来源路径或可编辑text）；不要未经许可复制字体二进制。用真实发光LED面/矩阵点和暗色板/边框/支架表达，字形可转换真实mesh但保编辑源，glTF带PBR和HDR emissive/KHR_materials_emissive_strength可读材质字段。不要把画好的光晕烘成透明光斑；光晕最终由Codex的原生Bloom产生。可附DCC compositor预览，但明确不是Engine结果。

先读实际主舞台/背墙包围，设计约宽5–6m、字高约1.0–1.3m、中心离地约3.8–4.2m的工作候选；这是可校核建议，不得强行碰穿现有桁架/竖灯或改建筑。建议引擎位置近x0/z-43附近，必须按真实背墙位置留至少5cm几何间隙，发光面离板有真实间距/厚度，避免共面闪烁。前向朝舞池/入口，保持单北低舞台、现有DJ台/双悬挂灯/二楼。像素LED合理简化并合并draws，不生成数万独立小对象；不新增原生Point/Spot，不修改全馆曝光。粉白或粉紫清晰文字，亮部保文字轮廓，不做整面红屏。

源文件.blend放020/source，原创SVG/字形源/纹理在020/design或textures，构建脚本020/scripts；只导出LED和安装构件GLB到020/exports，不导出全场，唯一对象名前缀WB020_STAGE_LED_。米制、glTF Y-up，记录轴向/变换/包围和可接入对象映射，不改变家具或建筑源。用导入真实舞台上下文拍远/近/斜视实际DCC图，确认四字与可见性/穿插，输出模型/材质/三角数/源和GLB SHA。制作自检不等Codex实际Engine验收，不新增报告堆积。真实失败留log，同条件最多一次恢复，不循环重试/换模型。完成后简短告知实际文件路径与接入注意点。
