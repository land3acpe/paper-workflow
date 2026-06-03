# Paper Workflow

将论文控制算法移植到双三相 PMSM FOC 平台（TMS320F28377D）的标准化流水线 skill。主 Agent 按固定顺序编排三个子 Agent：

```
research agent → Simulink agent → DSP agent
   (Phase 1)       (Phase 2)        (Phase 4)
```

后一个依赖前一个的产出。每个子 Agent 完成后生成 `.md` 工作报告并与用户确认。子 Agent 遇到不确定信息时执行**不确定性上报**：停下 → 查前序文档 → 问用户 → 继续，禁止猜测。

## 快速开始

```
/paper-workflow
```

启动后自动执行：

| Phase | Agent | 产出 |
|-------|-------|------|
| **Phase 0** | 主 Agent | 工作区预扫描，确认论文/DSP工程/仿真模板三项就位 |
| **Phase 1** | research agent | 算法提取 + 离散化推导 + 设计文档 |
| **Phase 2** | Simulink agent | Simulink 建模 + 扫参调参 + 仿真结果 |
| **Phase 3** | 主 Agent | 多工况验证 + FFT 分析 + 最终确认 |
| **Phase 4** | DSP agent | C 代码生成 + 自检 + ISR 集成 + 部署 |

## 前置条件

用户必须在工作区提供以下三项，缺一不可：
- **论文/参考文献**（PDF 或 .md）
- **DSP 工程目录**（含 ISR 入口、配置头文件）
- **仿真模板**（Simulink .slx，含电机模型 + FOC 基础架构）

Skill 本身不提供模板，缺失则暂停流程。

## 优先级规则

| 优先级 | 规则 |
|--------|------|
| **P0** | 上下文超过 50% 时执行压缩 |
| **P1** | 子 Agent 顺序执行，不确定性上报 |
| **P2** | 每阶段前查阅积累的经验 |
| **P3** | 修改文件前做版本备份 |
| **P4** | 写代码前加载 platform-profile.md 替换占位符 |
| **P5** | DSP 代码生成后强制自检 |

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
