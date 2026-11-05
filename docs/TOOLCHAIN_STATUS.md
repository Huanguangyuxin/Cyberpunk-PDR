# Toolchain status / RUN-DESIGN-001

日期2026-10-28。实际核查结果，不是生产完成声明。

## Codex → Cursor Gemini

本机cursor-agent/agent/cursor均存在，CLI版本2026.07.23-e383d2b。官方CLI页面已读取，help验证支持print、json/stream-json、model、workspace、worktree与resume。models实际退出1：Authentication required。没有成功获取账户模型ID列表，不能猜底层ID、不能声称非交互调用已通过。

替代的官方桌面途径已实际执行：打开Cursor现有应用，在新会话选定已有Cyberpunk文件夹，模型菜单选“Gemini 4 Argon Medium”，提交CURSOR-GEMINI-DESIGN-001。UI随后显示探索14文件、4搜索、1命令及具体空间计算活动。输入任务和上下文哈希在evidence/cursor/；派工截图与AX记录已保存。桌面可用不等于CLI已认证。没有静默换模型。

后续实际尝试官方cursor-agent login：打开Cursor官方认证页，继续后到需填写账户的登录页，未自动继承桌面登录；未猜测邮箱或索取密码。登录等待已中止，CLI认证仍未完成。随后桌面Gemini确实写入spatial-contract.json，独立审查退回12项问题，再次通过桌面派发修订。桌面UI的Completed仅代表该轮结束，不代表任务或设计验收完成。

执行中的专业任务范围仅Design/v1/spatial和专用receipt；其他长期文档由总控维护。CLI worktree是help发现的能力，未实际测试并行隔离。桌面当前在同一现有工作区执行，不能称隔离checkout。用户表示不了解CLI登录步骤，因此目前不依赖用户登录，继续桌面派工。

## Blender与DCC

Blender MCP get_addon_status/get_scene_info都实际返回无法连接；未不断重试。应用存在。后台独立factory-startup进程实际运行成功：Blender5.2.3 LTS、Python3.13.13、background=true、glTF导出操作符存在。日志evidence/blender-cli-probe.log。未导出新资产、未改live场景，不能称资产管线已完成。Substance/Houdini未在/Applications中发现，不能假设不存在于其他位置或已有许可。

## 图像工具

内置image_gen已实际返回两版风格板，均为生成概念，不是Nano Banana和引擎截图。v1被用户否定，撤出基线；v2使用原作R11/R12/R07图片作输入，待审查。输出已复制到项目Design/v1/concepts。模型内部ID未由该工具暴露，不凭工具名补写模型身份。

## 自研引擎

0.4.18安装与CLI只读状态已核实；当前dev stopped，未启动渲染。详细接口与真实证据等级见ENGINE_CAPABILITY_AUDIT.md。当前V7工程与V3设计尺寸冲突，禁止直接继承为新设计。高级渲染接口存在不能称其像素效果、容量和性能已验证。

## 官方文档

[Cursor CLI官方说明](https://cursor.com/docs/cli/overview)用于核对工具调用模式；本机help和真实返回是当前安装的执行依据。后续若CLI恢复认证，先重新models取得真实ID，再做限定写入的最小任务与日志验证；不能仅把桌面名称转换成猜测的命令行ID。

## 最新执行补充：RUN-DESIGN-002

上文为初始核查快照，不是最新完成列表。Cursor桌面真实DESIGN-005/006均已完成，UI模型名仍Gemini 4 Argon Medium；原始提示、截图/AX、回执及计划历史在evidence/design-v2和Design/v2/plan。CLI仍未认证，底层API模型ID未获证实。总控后补的6d9源绑定明确标为Codex，未伪称Gemini更新。

Blender5.2.3 CLI实际执行完整设计灰盒、九机位/ID/线框/真实raycast深度、PBR样板、可执行源着色、局部体积和内收构造检查；日志保留失败与修复。MCP连接未恢复验证。没有生产GLB导出或新引擎场景集成。

image_gen本轮只生成一张二维原创印花设计源和一张真实灰盒/ID约束的表面细化候选；后者有局部几何漂移被独立审查限制采用，不作为建模权威。没有偷偷更换模型、调用Nano Banana或批量生成场景。

历史引擎V7的真实硬件probe已在前轮完成，详见evidence/engine-runtime-probe及ENGINE_CAPABILITY_AUDIT；这替代上文“未启动”的历史状态，但不是新PDR效果或功能验收。当前本轮未启动新引擎、未改其代码；32活动灯上限继续适用。
