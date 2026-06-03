# Paper Workflow

论文算法 → Simulink 仿真 → DSP 部署 的标准化流水线 skill。用于将论文中的控制算法（ESO、STSM、ADRC、SMC、谐振等）移植到双三相 PMSM FOC 平台（TMS320F28377D）。

## 快速开始

```
/paper-workflow
```

启动后自动执行 Phase 0 工作区预扫描 → Phase 1 方案设计 → Phase 2 Simulink 建模 → Phase 3 仿真验证 → Phase 4 DSP 部署。

## 前置条件

用户必须在工作区提供：
- **论文/参考文献**（PDF 或 .md）
- **DSP 工程目录**（含 ISR 入口、配置头文件）
- **仿真模板**（Simulink .slx，含电机模型 + FOC 基础架构）

三项缺一不可。Skill 本身不提供模板，缺失则暂停。

## 文件结构

```
paper-workflow/
├── SKILL.md                          # 主 skill 定义（优先级规则 + Phase 0~4）
├── README.md                         # 本文件
├── platform-profile.md               # 平台适配层（占位符→真实符号映射）
├── platform-profile.example.md       # 参考平台样板（M_DualThree_VSD_FOC）
└── references/
    ├── dsp-deployment.md             # Phase 4 DSP 部署详细流程
    ├── pitfalls.md                   # 14 条高频错误与避坑指南
    └── experience-mechanism.md       # 经验积累机制与条目模板
```

## CHANGELOG

### v2.1 (2026-06-03)

**新增：**
- **P1 子 Agent 顺序执行规则**：research → Simulink → DSP，串行不可并行，后一个依赖前一个产出
- **Phase 0 工作区预扫描**：论文/DSP 工程/仿真模板三项必需检查，缺失则暂停
- **不确定性上报协议**：子 Agent 遇不确定信息 → 停下 → 查前序文档 → 问用户 → 继续，禁止猜测
- **Agent 类型章节**：三种专用子 Agent 的输入/任务对照表（与"子技能"区分）
- **子 Agent 工作报告规范**：每 Agent 产出 `.md` 报告的路径和最小内容要求

**调整：**
- 优先级规则重编号：P1(子Agent) > P2(经验) > P3(备份) > P4(适配) > P5(自检)
- 概述更新为 5 Phase + 6 条核心原则
- Phase 1/2/4 标题标注对应 Agent 类型
- 明确 skill 不提供模板，所有模板由用户提供

### v2.0 (2026-06-02)

**新增：**
- **P4 强制代码自检与返工机制**：五级清单（编译预检 → 符号交叉引用 → 逻辑正确性 → 条件编译回退 → 返工规则），自检不通过不得进入 ISR 集成
- `references/dsp-deployment.md` 新增 §4b 自检章节（4b-1~4b-5）

### v1.0 (2026-05)

**初始版本：**
- 4 Phase 开发流程（方案设计 → Simulink 建模 → 仿真验证 → DSP 部署）
- 平台适配层（platform-profile.md + `<占位符>` 机制）
- 14 条常见陷阱文档
- 经验积累机制
- 可行性预判、多速率配置、审批门机制
