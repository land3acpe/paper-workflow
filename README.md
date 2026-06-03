# Paper Workflow: 论文算法 → Simulink → DSP

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-blue)](https://claude.ai/code)

一个面向电机控制工程师的 **Claude Code skill**，将论文中的控制算法从理论推导→Simulink 仿真建模→C2000 DSP C 代码生成→ISR 中断集成的完整流水线标准化为 5 个 Phase（Phase 0 预扫描 + Phase 1~4），由主 Agent 编排三个子 Agent（research → Simulink → DSP）按顺序执行，每个 Phase 结束有审批门，用户掌控全流程。

---

## 目录

- [适用场景](#适用场景)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [四阶段工作流](#四阶段工作流)
- [平台适配机制](#平台适配机制)
- [经验积累系统](#经验积累系统)
- [工作流脚本](#工作流脚本)
- [常见陷阱](#常见陷阱)
- [FAQ](#faq)

---

## 适用场景

**✅ 适用：**
- 把论文或参考模型中的控制算法（ESO、STSM、ADRC、SMC、谐振控制器等）部署到双三相（DTP）PMSM 平台
- 修改 Simulink FOC 电流环，新增 xy 子空间谐波抑制
- 生成 C2000 / TMS320F28377D / F28379D / F28069 的 DSP C 代码
- 集成算法到 PWM ISR 中断服务程序

**❌ 不适用：**
- 单纯调试已有代码 bug（用 `systematic-debugging` skill）
- 与电机控制无关的通用功能开发（用 `brainstorming` + `writing-plans`）
- 仅做仿真、完全不涉及算法移植或 DSP 部署

---

## 快速开始

```bash
# 1. Clone 仓库
git clone https://github.com/land3acpe/paper-workflow.git
cd paper-workflow

# 2. 安装 skill 到 Claude Code（二选一）
# 方式 A：直接用项目内的 skill（推荐）
#   — 在 paper-workflow/ 目录下启动 claude 即自动加载

# 方式 B：复制到全局 skills 目录
cp -r .claude/skills/paper-workflow ~/.claude/skills/paper-workflow/

# 3. 创建你的平台配置文件
cp .claude/skills/paper-workflow/platform-profile.example.md \
   .claude/skills/paper-workflow/platform-profile.md
# → 编辑 platform-profile.md，把你的 Simulink 块名、DSP 符号、宏填进去

# 4. 放入你的工程文件
#   - simulink/  → 参考模型 .slx
#   - paper/     → 参考论文 PDF
#   - hardware/  → 硬件原理图、用户手册
```

安装后在 Claude Code 对话中直接说「我要部署论文里的 XX 算法到 xy 轴」，skill 自动触发。

---

## 项目结构

```
paper-workflow/
├── .claude/skills/paper-workflow/    # skill 本体
│   ├── SKILL.md                      # 主流程：Phase 1→2→3→4 完整定义
│   ├── platform-profile.example.md   # 平台配置模板（fork 者需复制并填写）
│   └── references/                   # 拆分参考文件（按需加载）
│       ├── dsp-deployment.md         # Phase 4 DSP 部署详细流程
│       ├── pitfalls.md               # 14 条高频错误与预防
│       └── experience-mechanism.md   # 经验积累机制与模板
│
├── workflows/                        # 可选的批量工作流脚本
│   ├── README.md                     # 脚本使用说明
│   ├── phase1_sim_code.js            # Phase 1: 批量生成仿真代码
│   ├── phase2_model_create.js        # Phase 2: 创建模型并仿真
│   └── phase3_dsp_code.js            # Phase 3: 生成 DSP C 代码
│
├── simulink/                         # 放入你的 .slx 参考模型
├── paper/                            # 放入你的参考论文
├── hardware/                         # 放入硬件文档
│
├── CLAUDE.md                         # Claude Code 项目级配置
├── .gitignore
├── LICENSE                           # MIT
└── README.md
```

---

## 五阶段工作流

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Phase 0    │     │  Phase 1    │     │   Phase 2    │     │   Phase 3    │     │   Phase 4    │
│  工作区扫描 │────▶│  方案设计   │────▶│ Simulink 建模│────▶│  仿真验证    │────▶│  DSP 部署    │
│  (主Agent)  │     │ (research)  │     │  (Simulink)  │     │  (主Agent)   │     │   (DSP)      │
└─────────────┘     └─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                    │                    │                    │
  ✅ 就位确认          ✅ 审批门             ✅ 审批门             ✅ 审批门           ✅ 硬件安全门
```

每个 Phase 结束有用户审批门，必须用户明确确认后才进入下一步。子 Agent 按固定顺序串行执行，后一个依赖前一个的产出。遇不确定信息时执行**不确定性上报**：停下 → 查前序文档 → 问用户 → 继续。

### Phase 0: 工作区预扫描（主 Agent）

启动后首先扫描工作区，确认三项必需文件就位：

| 检查项 | 必需性 | 说明 |
|--------|--------|------|
| 论文/参考文献 | **必需** | PDF 或 .md 格式的算法来源 |
| DSP 工程目录 | **必需** | 含 ISR 入口、配置头文件 |
| 仿真模板 | **必需** | Simulink .slx，含电机模型 + FOC 基础架构 |

> 缺少任一必需项 → 暂停，列出缺失清单要求用户提供。Skill 本身不提供模板。

### Phase 1: 方案设计（research agent）

> 由 **research agent** 执行。完成后生成 `research/report.md` 工作报告，主 Agent 与用户确认后进入 Phase 2。

| 步骤 | 内容 | 关键产物 |
|------|------|---------|
| 1a | 探索项目上下文：读取参考模型结构、电机参数、DSP 项目布局 | 上下文报告 |
| 1b | 逐轮澄清：算法来源、部署目标轴、控制频率、工况 | 需求确认清单 |
| 1c | 可行性预判：`E_peak = Flux × Pn × ω_mech`，`vlim = Udc/√3` | 裕量判定 |
| 1d | 公式推导：连续域→离散化→VSD 坐标适配→完整控制律→饱和限幅 | 离散控制律 |
| 1e | 仿真改造方案：新增/替换子系统、信号路由、多速率配置 | 改造对照表 |
| 1f | 参数计划：论文初值 + 扫参范围 + 优先级 | 扫参矩阵 |
| 1g | 验收标准：THD 目标、转速误差、电压裕量、工况范围 | 验收清单 |

> **产出物：** 完整 Markdown 设计文档，保存到项目 `docs/` 目录。

### Phase 2: Simulink 建模与调参（Simulink agent）

> 由 **Simulink agent** 执行，基于 Phase 1 设计文档工作。完成后生成 `simulink/report.md` 工作报告，主 Agent 与用户确认后进入 Phase 3。

1. 复制参考模型 → 重命名
2. 修改 InitFcn 指向新参数文件（绝对路径）
3. 修改顶层块：母线电压、负载转矩、转速参考、PWM 频率
4. 在 Current_Controller 中新增/替换控制器（MATLAB Function / EMChart）
5. 增加 To Workspace 观测信号（ix, iy, iq, id, n, Ux）
6. 扫参：`omega_o → lam1 → lam2`
7. THD = `sqrt(ix_rms² + iy_rms²) / |iq_mean| × 100`，取稳态最后 40%

**异常处理：**

| 异常 | 症状 | 处理 |
|------|------|------|
| 仿真发散 | ix/iy 指数增长 | 降增益为 1/10 重试 |
| 持续饱和 | Ux/Uy 贴 vlim | 检查 vlim 与 Udc 匹配 |
| 闭环比开环差 | THD 反而更大 | ESO 误差符号反了 |
| THD 走平不动 | 多组参数无改善 | 触碰物理下限，报告用户 |

### Phase 3: 仿真验证与 DSP 决策

- 多工况验证（不同转速 × 负载组合）
- FFT 分析谐波分布（`pwelch`），确认主峰在 6fe/12fe
- 汇总结果表，确认参数已同步到文件
- **明确询问用户是否进入 DSP 部署**

### Phase 4: DSP 部署（DSP agent）

> 由 **DSP agent** 执行，基于 Phase 1 设计文档和 Phase 2-3 仿真结果工作。完成后生成 `dsp/report.md` 工作报告。

| 步骤 | 内容 |
|------|------|
| 4a | 生成 `xxx.h`（struct + 声明）和 `xxx.c`（init + calc + 入口函数） |
| 4b | **代码自检与返工（强制门控）：** 五级清单（编译预检→符号交叉引用→逻辑正确性→条件编译回退→返工规则），不通过则回退重改 |
| 4c | ISR 中断集成，条件编译保留原 PI 代码 |
| 4d | 集成检查清单（8 项：init 调用、时序、vlim、防积分饱和、DAC 等） |
| 4e | **硬件安全门（高风险）：** 低压首测、电流限幅、速度斜坡、急停、PWM 先禁能、过流保护、探头安全 |
| 4f | 上机验证（DAC 观测 z2/Out/Fbk）+ 回退方案（条件编译或运行时切换） |

> **红线：** 绝不删除原 PI 代码段。始终保留编译时和运行时回退通道。代码生成后必须通过 4b 自检才能进入后续步骤。

---

## 平台适配机制

skill 正文使用 `<占位符>` 编写，所有平台特定值（Simulink 块名、DSP 符号、宏名）集中在 `platform-profile.md` 一张映射表中。

**执行时 P4 规则：** 任何改代码/改模型操作前，必须先加载 `platform-profile.md` 解析占位符 → 不存在或值仍是占位符的，停下来问用户，绝不猜测。

```
skill 正文 (通用)          platform-profile.md (你的工程)
─────────────────         ───────────────────────────────
<VDC_BLOCK>          →    Vdc1 (你的母线电压块名)
<ISR_CTRL_FN>        →    null_d_control() (你的 ISR 控制函数)
<TS_MACRO>           →    CL_TS (你的控制周期宏)
<CTRL_STRUCT>        →    CTRL (你的全局控制器结构体)
...
```

**`platform-profile.example.md`** 包含了双三相 VSD 参考平台（`M_DualThree_VSD_FOC`）的真实配置，作为填写范例。**红线：不能把 `.example` 当你的工程——你的工程值必须自己填。**

---

## 经验积累系统

每次使用 skill 过程中发现的新规律，Phase 结束后展示给用户确认 → 写入经验区。

| 类型 | 存储位置 | 内容 |
|------|---------|------|
| **通用规律** | SKILL.md「积累的经验」区 | 跨项目适用的规律（如 "ESO 误差符号必须与控制律一致"） |
| **项目特定** | 项目 `docs/superpowers/experience.md` | 与特定电机/论文/工况绑定的记录 |

每条经验包含：适用算法 / 适用条件 / 编辑日期 / 触发阶段 / 详细内容。

Agent 在执行前自动逐条比对当前任务与已有经验的条件字段 → 匹配的强制执行，不匹配的跳过。

---

## 工作流脚本

`workflows/` 目录下有 3 个可选的批量工作流脚本，适用于已知算法、重复执行场景：

```bash
# 在 Claude Code 对话中使用
/workflow workflows/phase1_sim_code.js   # → 生成 .m 仿真代码
/workflow workflows/phase2_model_create.js # → 创建 .slx 模型并仿真
/workflow workflows/phase3_dsp_code.js     # → 生成 .c/.h DSP 代码
```

这些脚本是**通用模板**——使用时 skill 会结合你的 `platform-profile.md` 和参考论文自动填充算法细节。

---

## 常见陷阱

来自 `references/pitfalls.md`，以下是高频错误（完整 14 条见文件）：

| # | 陷阱 | 症状 | 预防 |
|---|------|------|------|
| 1 | ESO 误差符号不一致 | THD 比开环还差 | 约定 `e1 = i_meas − z1`，控制律 z2 前馈用 `−z2` |
| 3 | 反电动势饱和 | 转速上不去，THD 突增 | 先算 E_peak = Flux×Pn×ω_mech |
| 4 | 轻载 THD 无意义 | THD > 100% | iq≈0 时分母太小，至少半载再算 |
| 8 | DSP 代码 Ts 不匹配 | DSP THD 与仿真差很多 | .c 中 Ts 默认值必须等于实际 CL_TS |
| 9 | STSM 有效增益理解错误 | 换电机后 THD 恶化 | 实际增益 = Lz × lam，按 Lz 反比缩放 |
| 12 | VSD 变换矩阵不一致 | xy 电流有直流偏移 | 仿真/DSP 用同一套 VSD 变换 |
| 14 | REAL 类型别名与宏并存 | 换 typedef 后静默不一致 | 直接 include 主头文件，去掉自带的 #define |

---

## 依赖

- **Claude Code**（skill 宿主环境）
- **MATLAB + Simulink**（Phase 2-3 仿真，含 Simscape Electrical / Stateflow / Motor Control Blockset）
- **MATLAB MCP Server**（matlab MCP，需在 `settings.json` 中启用）
- **TI C2000 编译器 + CCS**（Phase 4 DSP 部署）

---

## FAQ

**Q: 这个 skill 只适用于双三相 PMSM 吗？**  
A: 当前 skill 的 VSD 变换和 xy 子空间是 DTP 特有的，但 Phase 1/2/4 的核心流程（方案设计→EMChart 建模→C 代码生成→ISR 集成）对三相 PMSM 同样适用，只需跳过 xy 轴即可。

**Q: 不装 MATLAB MCP Server 能用吗？**  
A: Phase 1 方案设计不需要 MATLAB。Phase 2-3 涉及 Simulink 操作时需要。你也可以手动操作 Simulink，让 skill 仅做方案设计和代码生成。

**Q: 怎么贡献经验回 skill？**  
A: 使用过程中产生的新发现，Phase 结束时会提示你是否写入。通用规律写回 SKILL.md，项目特定记录写回你项目的 `docs/`。

**Q: 平台配置里的占位符有 20+ 个，哪些是必须填的？**  
A: Phase 1 时会逐个确认——skill 会在遇到未定义的占位符时停下来问你。一般首次使用会花 15 分钟填完。

---

## License

MIT © [land3acpe](https://github.com/land3acpe)

---

## 更新日志

### v2.1 (2026-06-03) — 子 Agent 顺序执行 + 工作区预扫描

**新增：**
- **P1 子 Agent 顺序执行规则**：主 Agent 编排 research → Simulink → DSP 三个子 Agent，串行不可并行。每个子 Agent 完成后生成 `.md` 工作报告，主 Agent 与用户确认后方可进入下一阶段。
- **Phase 0 工作区预扫描**：启动时检查论文/DSP 工程/仿真模板三项必需文件，缺一暂停。Skill 本身不提供模板。
- **不确定性上报协议**：子 Agent 遇不确定信息 → 停下 → 查前序 Agent 产出文档 → 问用户 → 继续，禁止猜测。
- **子 Agent 工作报告规范**：每个 Agent 的 `.md` 报告路径和最小内容要求。

**调整：**
- 优先级规则重编号：P1(子Agent) > P2(经验) > P3(备份) > P4(适配) > P5(自检)
- Phase 1/2/4 标题标注对应 Agent 类型（research / Simulink / DSP）
- Phase 4 流程重编号：4a(代码生成)→4b(自检)→4c(ISR集成)→4d(检查清单)→4e(硬件安全门)→4f(上机验证)

### v2.0 (2026-06-02) — P4 强制代码自检与返工机制

**新增 P4 优先级规则：** DSP 代码生成后必须执行五级强制自检，查出问题必须返工重改、直至全部通过。

**Phase 4 新增 §4b 代码自检与返工（强制门控）：**

| 自检层级 | 内容 | 检查要点 |
|---------|------|---------|
| 4b-1 编译预检 | include 链完整性、类型一致性、宏来源、无硬编码、数学库可用 | 5 项 |
| 4b-2 符号交叉引用 | struct 字段存在性、全局变量可访问性、函数签名匹配、调用点参数 | 5 项 |
| 4b-3 逻辑正确性 | ESO 误差符号、一拍延迟顺序、饱和限幅位置、除零保护、缓冲区越界、初始化完整性 | 6 项 |
| 4b-4 条件编译回退 | 宏默认值、原 PI 代码保留、赋值通路一致性、编译切换验证 | 4 项 |
| 4b-5 返工规则 | 定位根因 → 修复源头（不搞权宜补丁）→ 全量重检（从 4b-1 重新开始）→ 记录通用发现 | 流程 |

**循环返工模式：**
```
DSP 代码生成 → 五级自检 → 发现问题？
                            ├── 是 → 定位根因 → 修复 → 全量重检（回到 4b-1）
                            └── 否 → 自检通过 → 进入 ISR 集成
```

**其他变更：**
- Phase 4 流程重编号：原 4b~4e → 新 4c~4f
- 新流程：4a(代码生成) → **4b(自检)** → 4c(ISR 集成) → 4d(检查清单) → 4e(硬件安全门) → 4f(上机验证)
- **红线：自检不通过不得进入 ISR 集成；"差不多"、"应该没问题"均视为未通过。**

### v1.0 (2026-06-01) — 初始发布

- 四阶段工作流：方案设计 → Simulink 建模 → 仿真验证 → DSP 部署
- 平台适配层机制（platform-profile.md 占位符映射）
- P0/P1/P2/P3 四条优先级规则
- 14 条常见陷阱文档 (pitfalls.md)
- 经验积累系统
- 3 个工作流脚本 (phase1/2/3)
