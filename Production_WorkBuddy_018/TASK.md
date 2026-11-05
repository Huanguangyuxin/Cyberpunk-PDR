# WB018 — 对照丽姿酒吧继续实际美术修复

用户本轮明确：“还有work Buddy继续修，让它对比我们参考的游戏赛博朋克2077的丽姿酒吧修”。沿用原任务，实际模型保持UI Claude-Opus-5.5。不是继续旧打包任务，不重复写017说明。Codex同步修酒液，WB只写Production_WorkBuddy_018/；Engine、014、016、015、017、Design/ACTIVE_PROTOTYPES、References、UGit上传快照只读。绝不改液体/杯瓶/其光学着色器、SDK、引擎核心、当前全场文件。Codex串行合入，勿自行启动第二Engine/HMR/打包/全馆重建。

先读项目AGENTS、DECISIONS最新D059、PROGRESS、ART_DIRECTION、SCALE_STANDARD、Engine AGENTS/README、相关材质/渲染技能；旧TASK限制以本018新授权为准。真实基线为当前Engine/forge.json与assets，以及015/source/club-workbuddy015-upper-final.blend（0de38371）；运行主GLB为Engine/assets/Club_Upper_WB015_bcf6514f.glb（bcf6514f）。017后处理已合入当前源码，不能说仍未合入，也不能重新叠加Bloom/ACES。现成HTML是D057，后续新源不自动同步它。

必须实际查看原作图像，不只读文字：References/REFERENCE_LIBRARY.md、References/manifest.json、References/images/；References/video_BV15r4y1N7ge/OBSERVATIONS.md及目录内截图、glass子目录。补充Engine/docs/references/BV15r4y1N7ge/frames/现有真实视频截帧。视频https://www.bilibili.com/video/BV15r4y1N7ge/；本机已保存参考优先，缺少内容再官方公开浏览，不用泛用AI赛博朋克图代替。当前实际Engine图可先查看014/evidence/D057-browser-open/click-start-running.png与014/evidence/D052-built（后者只作历史说明）；Codex将补新同源全景。

重点：冷蓝暗环境+大面积局部粉红/粉白受光，真实大顶棚折线/块面灯带、座基/柱/门框灯带照亮邻面；工业粗中细结构、廉价混杂材料、原创可编辑图形/标识与多次改装层次。避免整齐高级演出厅、单纯提亮霓虹或全馆粉色ambient染色；舞台单北端地面低台，不能增加后台。

实际执行：先从图像和当前真实源选出2–3个最明显差距，立即在018内做可接入的修复候选（例如真实灯带/安装附件、舞台或外廊选定装饰的几何/材质），不交只有报告的结果。复制或导入当前真实源到018独立Blender进程，保持对象名称/坐标/尺度/布局和新上层；限定选定对象局部修改，不批量重构。保存可编辑.blend、选定对象导出GLB（不是全场替换）、原创纹理/图形源、准确对象名/材质/原生灯名映射与回滚。灯光改动给带现值/建议值/依据的纯参数候选，须32原生灯内复用、保主光源来源，待Codex串行接Engine。

保矩形、无厨房/后场/员工专用通道、单北低台、6同款无背吧凳转角0、18普通椅当前修复/桌位、1.75m人体/1.64m眼高、当前二楼高宽/4独立门隔墙VIP/双梯/玻璃护栏、干燥少雾前厅→深厅湿雾、第一人称与碰撞。不要改全馆曝光、建筑和通路来凑单张好图。不擅换模型/引擎/参考，不私复制原游戏品牌/受保护资产。

交付：实际参考文件/帧位置与修改对象的对应；018脚本/.blend/选定GLB/可编辑素材/接入映射；固定源固定相机真实Blender前后图（明确DCC非Engine）；实际文件SHA与简短收件说明。不得AI图冒充、不得用旧渲染称新效果。不要新增重复审查报告/整套测试循环，必要编译与真实图即可。Codex负责最终实际Engine效果，生产自检不能称已验收。遇真实错误留日志，最多一次同条件恢复，不循环消耗额度；共享Blender会话只读，你使用隔离CLI，Codex不占共享会话。
