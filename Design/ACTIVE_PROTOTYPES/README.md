# 当前唯一原型图包

用户认可矩形整馆方案，要求补区域/物件原型，随后由WorkBuddy的Claude-Opus-5.5制作3D。旧原型撤出当前方案，历史图片仅留证据，不纳入交接输入。

本包9张图均由内置image_gen生成，是概念设计，不是已建模资产或引擎截图。MASTER是建筑关系和微调基准，区域图补视角、物件图补造型/工艺。AI图片不能证明严格几何一致，图中乱码/尺寸箭头由CONSTRUCTION_TARGETS.json纠正。

当前微调：主吧台仅6把同款无靠背圆座吧椅，转角0把；取消厨房/后场/员工专用通道。只有北端地面低舞台，二层为公众楼廊/座区。S01减椅后字幕未显示，制作字幕不能据此删除，应采用MASTER与objects04文字/图形方案。

## 整馆与区域

- 00_MASTER_CURRENT.png：用户认可整馆，已减椅微调。
- scenes/01_FRONT_BAR_CURRENT.png：前厅，修正上层假舞台与多余吧椅。
- scenes/02_DEEP_REVERSE_CURRENT.png：从深处向入口看，东侧吧台在图左。
- scenes/03_UPPER_GALLERY_CURRENT.png：上廊向下看前厅，舞台不入镜。

## 独立物件

- objects/01_BAR_AND_STOOL.png：L形吧台、灯篷、背架及6把无背吧凳。
- objects/02_BOOTH_TABLE_PARTITION.png：卡座、桌、台灯、穿孔屏风、软包工艺。
- objects/03_CEILING_AND_WALL_LIGHTS.png：折线灯、扩散板、框架、吊装。
- objects/04_LED_AND_GRAPHIC_LIGHTS.png：点阵字幕、嘴唇/眼睛/成人非露骨剪影灯及安装。
- objects/05_BOTTLES_LIQUIDS_GLASSWARE.png：瓶型、玻璃/独立液体、杯具、瓶口与标签。

比例/数量/材质实际制作目标见CONSTRUCTION_TARGETS.json；MANIFEST.json记录当前图片SHA256。不得扫描history目录并混入旧稿。
