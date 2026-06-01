# Paper Workflow: 论文算法 → Simulink → DSP

本项目是 paper-workflow skill 的工程模板，提供论文算法移植到双三相 PMSM 平台的完整骨架。

## 核心规则

1. **使用 paper-workflow skill** — 任何涉及论文算法移植、Simulink 建模、DSP 部署的任务，先触发 paper-workflow skill
2. **设计先于编码** — Phase 1 产出完整设计文档后才能改模型/代码
3. **版本备份** — 改 Simulink/DSP 文件前先 git 备份或手动快照
4. **平台适配** — 所有 `<占位符>` 按 `platform-profile.md` 替换，不存在则问用户

## Fork 者使用说明

1. 复制 `.claude/skills/paper-workflow/platform-profile.example.md` 为 `platform-profile.md`
2. 将 `platform-profile.md` 中的值替换为你自己工程的实际符号
3. 将参考模型 .slx 放入 `simulink/`，论文放入 `paper/`，硬件文档放入 `hardware/`
4. 根据需要修改 `workflows/*.js`
