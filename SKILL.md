---
name: paper-workflow
description: Use when working on DTP-PMSM control algorithm deployment involving paper/reference-model translation, Simulink FOC current-loop changes, xy-subspace harmonic suppression, C2000/TMS320F28377D code integration, or DSP ISR deployment.
---

# Paper Workflow: 论文算法 → Simulink → DSP

## 优先级规则

**P0 — 上下文窗口超过 50% 时，在下一个任务开始前执行上下文压缩。** 若平台支持则执行 compact；否则先总结当前状态、产物、阻塞点，再继续。不得在上下文接近极限的状态下开始新的复杂任务。该规则优先级高于其他所有规则。

**P1 — 子 Agent 顺序执行与不确定性上报。** 本 skill 由主 Agent 编排，按固定顺序派发三个子 Agent，后一个依赖前一个的产出，不可并行：

1. **research agent** — 论文算法提取与方案设计（Phase 1）
2. **Simulink agent** — 仿真建模与调参（Phase 2）
3. **DSP agent** — 工程代码生成与部署（Phase 4）

每个子 Agent 完成后必须：① 在工作区对应子目录下生成 `.md` 工作报告；② 主 Agent 与用户沟通确认后方可进入下一阶段。子 Agent 遇到无法确认的信息（参数含义、公式符号、电机数据等）时执行**不确定性上报**：先停下 → 查阅前序 Agent 的产出文档 → 若仍无法解决，与用户沟通确认 → 再继续工作。不得猜测、不得跳过。此规则优先级仅次于 P0——子 Agent 顺序错乱或猜测信息将导致后续阶段全部作废。

**P2 — 每个 Phase 开始前，必须先查阅 [积累的经验](#积累的经验)。** 逐条比对当前任务（电机参数、算法类型、工况）与已有经验中记录的条件是否匹配。匹配的经验必须应用；不匹配的记录跳过但保留。不得跳过此步骤直接开始工作。若 [积累的经验](#积累的经验) 与项目 `docs/superpowers/experience.md` 均为空（或后者不存在），记录一句「无可用历史经验」后即可进入正式步骤，不必在空内容上反复比对。

**P3 — 修改 Simulink/DSP 文件前，必须先做版本备份、复制参考模型、不得直接覆盖参考模型。** 备份方式二选一：① 若目录是 git 仓库则 `git status` 确认干净后提交；② 否则把待改文件复制为 `xxx.bak_YYYYMMDD`（或对整个工程目录做一次快照）。先用 `git rev-parse --is-inside-work-tree` 判断属于哪种情况，不要假定 git 一定存在。新模型另存为独立文件；DSP 原代码段用条件编译保留，不删除。

**P4 — 任何写代码/改模型动作前，必须先加载平台适配层 `platform-profile.md`，把正文里的 `<占位符>` 解析成当前工程的真实符号。** 这是防止把别人工程的符号套到你工程上的关键规则：

- 正文中所有 `<尖括号>` 标记（如 `<ISR_CTRL_FN>`、`<CONFIG_HEADER>`、`<VDC_BLOCK>`）都是占位符，**不是真实符号**，绝不可原样写进代码。
- 若仓库存在 `platform-profile.md`，按其映射表替换占位符。`platform-profile.example.md` 是**参考平台（双三相 VSD 工程）的样板，不是你的工程** —— 仅当你确认正在该工程上工作时才可直接采用其值。
- 若 `platform-profile.md` 不存在、某占位符表中没有、或对应值仍是空/占位符：**停下来，向用户提问获取真实符号，绝不猜测、绝不照抄 `.example` 或示例工程（如 `M_DualThree_VSD_FOC`）里的名字。**
- 红线：在最终代码里出现任何未替换的 `<占位符>`，或把示例工程的 `null_d_control`/`CTRL.I`/`ACMConfig.h` 等私有符号当成当前工程符号 —— 都属于规则违反，停下重做。

**P5 — DSP 代码生成后必须执行强制自检；查出问题必须返工重改，直至全部通过。** 自检按 `dsp-deployment.md` §4b 的五级清单逐项核对：编译预检 → 符号交叉引用 → 逻辑正确性 → 条件编译回退 → 返工规则。任一项不通过即回退到代码生成步骤修复，不得跳过。只有自检全部通过后才允许进入 ISR 集成。此规则优先级与 P3/P4 同级——代码没通过自检就不能说 Phase 4 完成了。

## 概述

将论文或参考模型中的控制算法移植到双三相 PMSM 平台的标准化流程。5 个 Phase（Phase 0 预扫描 + Phase 1~4 开发流程），每个 Phase 结束有审批门，用户明确确认后才进入下一阶段。

**核心原则：**
- 用户提供模板——skill 本身不提供 DSP/仿真模板，缺失则暂停并告知用户
- 顺序执行——子 Agent 按 research → Simulink → DSP 串行执行，不可并行
- 不确定性上报——子 Agent 遇不确定信息时中止，先查前序文档再问用户，不猜测
- 设计先于编码——Phase 1 必须产出完整设计文档
- 用户掌控决策——每个 Phase 的"进入下一步"由用户说了算
- 经验积累——使用后发现的规律，先展示给用户，确认后才写入 skill

## 何时使用

**适用：**
- 把论文 / 参考模型中的控制算法（ESO、STSM、ADRC、SMC、谐振等）部署到双三相（DTP）PMSM 平台
- 修改 Simulink FOC 电流环、xy 子空间谐波抑制
- 生成 C2000 / TMS320F28377D 代码、集成到 PWM ISR

**不适用：**
- 单纯调试已有代码的某个 bug（用 systematic-debugging）
- 与电机控制无关的通用功能开发（用 brainstorming + writing-plans）
- 仅做仿真、完全不涉及算法移植或 DSP 部署

> **平台适配：** 本 skill 的流程是通用的，正文中具体的文件名、Simulink 块名、DSP 符号、宏均以 `<占位符>` 表示。真实值集中在 `platform-profile.md`（fork 者复制 `platform-profile.example.md` 后填自己工程的值）。`.example` 内为参考平台（双三相 VSD 工程 `M_DualThree_VSD_FOC`）的真实配置，作为填写样板。执行时一律以 `platform-profile.md` + 读取到的实际模型/代码为准（见 P4）。

## Phase 0: 工作区预扫描

在任何设计工作开始前，主 Agent 必须扫描用户工作区，确认以下三项均已就位：

| 检查项 | 必需性 | 说明 |
|--------|--------|------|
| **论文/参考文献** | **必需** | PDF (.pdf) 或文档 (.md/.txt) 格式的算法来源。供 research agent 提取算法公式和控制架构 |
| **DSP 工程目录** | **必需** | 目标嵌入式工程根目录，至少含 ISR 入口（main.c）、配置头文件、全局变量定义文件 |
| **仿真模板** | **必需** | 用户提供的 Simulink 参考模型（`.slx`），至少包含电机模型块和基础 FOC 架构（速度环 + dq 电流环 + VSD 变换） |

**处理规则：**
- 缺少任一必需项 → 主 Agent **暂停流程**，向用户列出缺失清单并要求提供。**不得自己创建模板、不得用其他工程的模板替代。**
- 算法仿真（具体控制器的 Simulink 模型）不要求用户预先提供——Simulink agent 可在仿真模板基础上搭建。
- 确认三项就位后，主 Agent 记录工作区路径结构（论文路径、DSP 工程根目录、仿真模板路径），然后进入 Phase 1 启动 research agent。

## Phase 1: 方案设计（research agent）

> **本阶段由 research agent 执行。** 主 Agent 将论文/参考文献和 Phase 0 扫描结果派发给 research agent。Research agent 完成算法提取和方案设计后，在工作区生成 `.md` 工作报告。主 Agent 与用户沟通确认设计方案后方可进入 Phase 2。Research agent 遇到无法确认的算法细节时必须执行不确定性上报（见 P1）。

采用 brainstorming 模式，在写任何代码前完成完整设计。

### 1a. 探索项目上下文

**前提检查：**
- 确认 MATLAB MCP server 已连接并可调用 `evaluate_matlab_code`
- 确认所需工具箱：Simscape Electrical（电机模型）、Stateflow（EMChart）、Motor Control Blockset（如适用）

**检查并报告：**（以下块名用 `<占位符>` 表示，实际名查 `platform-profile.md` 并以读取到的 .slx 为准）
- 参考模型结构（.slx 顶层子系统、采样时间 Tsimu、PWM 配置 fsw）
- 需要改动的顶层块：`<VDC_BLOCK>` 电压、`<SPEED_REF_BLOCK>` 信号链路、`<LOAD_TORQUE_BLOCK>` 负载转矩、`<PWM_GEN_BLOCKS>` 的 fsw
- 目标电机参数（Rs, Ld, Lq, Lz, Flux, Pn）——从 PMSM block 实际读取，不要依赖记忆
- 当前 `<CURRENT_CTRL_PATH>` 下 xy 轴控制子系统的确切路径和类型（SubSystem / EMChart / S-Function）
- 已存在的算法代码和控制器架构
- DSP 项目结构（ISR 位置、`<TS_MACRO>` 定义、浮点类型 `<REAL_TYPE>` 的 typedef）

### 1b. 逐轮澄清（每次一个问题）

必须确认的事项（逐个提问，不要批量）：
- 算法来源（论文名称/章节 / 参考模型中的具体子系统 / 已有代码）？
- 部署目标轴——d/q 轴还是 xy 轴？控制目标是什么（跟踪 / 抑制 / 解耦）？
- 控制频率（Ts）和 PWM 频率（fsw）？是否多速率？Ts 与 `<TS_MACRO>` 是否一致？
- 母线电压和额定工况（转速、负载转矩、额定电流）？
- DSP 目标型号（TMS320F28377D / F28379D / F28069）和编译器（TI C2000）？
- 是否有额外的谐振控制器 / 前馈需要保留？

### 1c. 可行性预判

公式推导之前，先做物理可行性快速评估。计算 `E_peak = Flux × Pn × ω_mech`，`vlim = Udc/√3`，`margin = vlim − E_peak`：

| 条件 | 判定 | 处理 |
|------|------|------|
| margin > 0.2 × vlim | 可行 | 继续 |
| 0.1 × vlim < margin ≤ 0.2 × vlim | 临界 | 警告用户 |
| margin ≤ 0.1 × vlim | 不可行 | **告知用户必须降速或升压**，暂停流程 |

### 1d. 公式推导

展示完整推导链，逐节等用户确认：

1. **源算法连续域方程** — 控制律 + 观测器（如有）
2. **离散化** — Forward Euler / Tustin，明确 Ts
3. **VSD 坐标适配** — 双 dq → VSD 变换关系，说明 xy 子空间电压方程：u_xy = Rs·i_xy + Lz·di_xy/dt + e_xy（反电动势谐波为扰动）。确认仿真和 DSP 用同一套 VSD 变换矩阵（T6→T2 是否转置、相序是否一致）
4. **观测器误差符号约定** — 必须明确：`e1 = i_meas − z1`（标准 LESO）还是 `e1 = z1 − i_meas`。一旦选定，控制律中 z2 前馈的符号必须与之匹配，否则扰动补偿反相
5. **完整离散控制律** — 每个采样周期的计算步骤（ESO/观测器更新 → 控制律 → 饱和），标注前一步的输出作为下一步的输入（如 u_prev 的一拍延迟）
6. **饱和与限幅** — vlim = Udc/√3，检查反电动势是否留有足够电压裕量（反电动势峰值 + 控制电压 < vlim）

### 1e. 仿真改造方案

对照参考模型，逐项列出需改动的内容：

| 改动类型 | 具体内容 |
|----------|---------|
| 新增子系统 | 在 `<CURRENT_CTRL_PATH>` 下新增 MATLAB Function (EMChart) 块 |
| 替换子系统 | 用新算法替换原有 `<XY_ALGO_BLOCKS>` |
| 信号路由 | Goto/From 标签、To Workspace 新增信号（至少 ix, iy, iq, n_real, Ux） |
| InitFcn | 新建 xxx_params.m，设**绝对路径**（避免 MATLAB 工作目录不同时报错） |
| 参数文件 | 电机参数 + 控制参数 + 扫参范围 |
| 多速率 | Tsimu（物理步长）/ Ts（控制周期）/ Tpwm（PWM 周期 = 1/fsw）三级配置 |
| 母线电压 | `<VDC_BLOCK>` 块的值，确保 vlim = Udc/√3 有足够裕量 |
| PWM 频率 | `<PWM_GEN_BLOCKS>` 的 fsw 参数 |
| 负载转矩 | `<LOAD_TORQUE_BLOCK>` 块的值（对 6 相 PMSM，Te = 3×Pn×Flux×iq） |
| 转速参考 | `<SPEED_REF_BLOCK>` 信号链路——如果是 Step→ZOH→Speed_Controller 则改 Step 的 After 值；如果直接用 rad/s 则改 Constant 值 |

展示一张信号流草图（ASCII），从参考输入 → 速度环 → dq 电流环 → xy 控制器（标出新算法插入点）→ VSD 逆变换 → PWM → 电机 → 采样 → VSD 正变换 → 回到控制器。

#### 多速率系统配置

三级时间基准：Tsimu（物理）< Ts（控制）≤ Tpwm（PWM = 1/fsw）。关键约束：

- Tsimu ≤ 1/(10×fsw)，否则 PWM Generator 报错
- EMChart 采样时间 = Ts，不是 Tsimu
- 过采样（Ts < Tpwm）时每 PWM 周期算多次，取最后一次结果；同步（Ts = Tpwm）最常见
- 不同速率子系统连接处必须插入 Rate Transition 块：控制器输出 [Ts] → RT → PWM [Tpwm]；采样 [Tsimu] → RT → 控制器 [Ts]

### 1f. 参数计划

论文参数作为初始值，标注需要扫参的范围和优先级：

```
参数          初始值          扫参范围           优先级
omega_o       4000            [1000, 64000]      ★★
lam1          20000           [5000, 200000]     ★★★
lam2          2e6             [5e5, 2e7]         ★★★
```

### 1g. 验收标准

逐项与用户沟通确定，不设默认值：

| 指标 | 候选值 | 用户确认 |
|------|--------|---------|
| THD 目标 | ≤ 10% | ? |
| 转速稳态误差 | ≤ 1 rpm | ? |
| 电压裕量 | Ux_peak ≤ 80% vlim | ? |
| 工况范围 | 最低/额定/最高转速 + 空载/满载 | ? |

### Phase 1 产出物

完整的 Markdown 设计文档，保存到项目 docs/superpowers/specs/ 目录。

**审批门：** 设计文档保存后，展示摘要（关键参数、算法选择、改动清单、验收标准），明确询问：

> 设计文档已完成。是否进入 Phase 2 Simulink 建模阶段？

用户确认后才开始修改模型。

## Phase 2: Simulink 建模与调参（Simulink agent）

> **本阶段由 Simulink agent 执行。** 主 Agent 将 Phase 1 设计文档和工作报告派发给 Simulink agent。Simulink agent 基于 research agent 的产出和用户提供的仿真模板进行工作。完成后在工作区生成 `.md` 工作报告。主 Agent 与用户沟通确认仿真结果后方可进入 Phase 3。Simulink agent 遇到无法确认的仿真细节时必须执行不确定性上报（见 P1），先查阅 research agent 文档再与用户沟通。

按 Phase 1 设计文档执行。关键步骤：

1. 复制参考模型 → 重命名
2. 修改 InitFcn 指向新参数文件（用**绝对路径**，避免 MATLAB 工作目录不同时报错）
3. 修改顶层块参数：`<VDC_BLOCK>`（母线电压）、`<LOAD_TORQUE_BLOCK>`（负载转矩）、`<SPEED_REF_BLOCK>`（转速参考值）、`<PWM_GEN_BLOCKS>` fsw
4. 在 `<CURRENT_CTRL_PATH>` 中替换或新增控制器子系统
5. 用 MATLAB Function (EMChart) 写离散算法

**EMChart 程序化修改方法：**
```matlab
rt = sfroot;
m = rt.find('-isa', 'Stateflow.Machine', 'Name', 'MODEL_NAME');
chart = m.find('-isa', 'Stateflow.EMChart', 'Name', 'CHART_NAME');
chart.Script = new_script_string;  % 替换整个脚本
save_system('MODEL_NAME');
```

6. 增加 To Workspace 块（至少：ix, iy, iq, id, n_real, Ux）
7. 扫参：omega_o → lam1 → lam2，THD = sqrt(ix_rms² + iy_rms²) / |iq_mean| × 100，取稳态（最后 40%）

> 调参前必读 [`references/pitfalls.md`](references/pitfalls.md)（尤其 #1 ESO 符号、#3 反电动势饱和、#4 轻载 THD、#9 STSM 有效增益）。

**审批门：** 展示结果后询问：

> 转速：xxx rpm（目标 xxx），iq：xx A，ix_rms：xx A，iy_rms：xx A
> THD：xx%（目标 ≤ xx%），电压峰值：xx V（vlim=xx V，利用率 xx%）
> 是否通过？[通过进入 Phase 3 / 调整参数重新仿真 / 修改工况]

### Phase 2 异常处理

扫参过程中可能遇到以下异常，不要当作普通调参继续，应按对应策略处理：

| 异常 | 症状 | 处理策略 |
|------|------|---------|
| **仿真不收敛 / 发散** | ix/iy 指数增长、报 "solver error" | ESO 或 STSM 增益过大导致数值不稳定。将 omega_o 和 lam1/lam2 各降为当前值的 1/10 重试，确认稳定后再逐步提高 |
| **持续饱和** | Ux/Uy 一直贴 vlim，控制电压截顶 | 控制电压裕量不足。检查：① vlim 是否与 Udc 匹配；② 反电动势是否已达到上限（回查 Phase 1 可行性预判）。如裕量确实不够，需回到 Phase 1 和用户确认是否降速或升压 |
| **THD 比开环还差** | 闭环 THD > 开环 THD | ESO 误差符号反了或 STSM 符号反了。检查 `e1` 和 z2 前馈符号是否一致 |
| **THD 随迭代走平** | 扫参中 THD 稳定在一个偏高值不动 | 已触及该工况的物理下限（PWM 纹波、死区等）。3 组不同数量级仍无改善则停止，报告用户 |

## Phase 3: 仿真验证与 DSP 决策

用户确认 Phase 2 结果后，在执行 DSP 部署前完成最终验证：

- 多工况验证（不同转速、负载组合，至少覆盖额定和极端工况）
- FFT 分析谐波分布——确认主要谐波峰值在 6fe 和 12fe（fe = Pn × n_rpm / 60）。用 `pwelch(ix, [], [], [], 1/Ts)` 做功率谱密度分析

- 汇总最终结果表（工况 / 转速 / iq / ix_rms / iy_rms / THD / 电压峰值）
- 确认所有硬编码参数已同步到参数文件

**明确询问：**
> 以上为最终仿真结果。是否进入 Phase 4 DSP 部署阶段？
> 确认后将生成 C 代码并集成到 ISR 中。代码修改前必须先做版本备份（git 仓库则提交，否则复制为 `.bak_YYYYMMDD` 或目录快照——见 P3）；硬件验证失败时可通过条件编译或运行时开关回退。

这是最后一个审批门，用户确认后进入 DSP 部署。

## Phase 4: DSP 部署（DSP agent）

> **本阶段由 DSP agent 执行。** 主 Agent 将 Phase 1 设计文档和 Phase 2-3 仿真结果派发给 DSP agent。DSP agent 基于 research agent 的算法设计和 Simulink agent 的仿真数据生成 DSP C 代码。完成后在工作区生成 `.md` 工作报告。DSP agent 遇到无法确认的工程细节时必须执行不确定性上报（见 P1），先查阅前序 agent 文档再与用户沟通。

> **进入前必读：** [`references/dsp-deployment.md`](references/dsp-deployment.md)。该文件含完整部署流程：4a 算法代码生成 → **4b 代码自检与返工（强制门控）** → 4c 中断集成（条件编译/运行时切换）→ 4d 集成检查清单 → **4e 硬件安全门（高风险物理操作，逐项确认）** → 4f 上机验证与回退。

DSP 上机属于高风险操作，必须按 dsp-deployment.md 的 4e 硬件安全门逐项确认后才能上电。**绝不删除原 PI 代码段**（保留供条件编译回退）。代码生成后必须通过 4b 自检才能进入后续步骤——自检不通过即返工，不得跳过。

## 经验积累机制

每个 Phase 结束、产生新发现时，先展示给用户、确认后才写入。**写入流程与条目模板见** [`references/experience-mechanism.md`](references/experience-mechanism.md)：通用规律写入下方「积累的经验」区，项目特定记录写入项目 `docs/superpowers/experience.md`。

## 积累的经验

（当前为空，等待用户确认后写入。项目特定经验见项目 `docs/superpowers/experience.md`）

## 子 Agent 工作报告规范

每个子 Agent 完成后必须在工作区对应位置生成 `.md` 工作报告。报告最小内容：

| Agent | 报告路径 | 必须包含 |
|-------|---------|---------|
| **research** | `工作区/research/report.md` | 算法来源（论文章节/公式编号）、离散化推导过程与最终递推式、参数物理含义对照表、与 DSP 平台适配的注意事项 |
| **Simulink** | `工作区/simulink/report.md` | 模型改动清单（新增/修改的块及路径）、参数文件内容、扫参结果表格（每行：参数组 → THD → 备注）、最终参数选定值及理由 |
| **DSP** | `工作区/dsp/report.md` | 生成的文件清单及每文件行数、自检结果（4b-1~4b-4 逐项通过/失败）、已知限制（如"RC 需一个基波周期填充"）、待上机验证项 |

报告由对应子 Agent 直接写入，主 Agent 在各 Phase 审批门展示摘要。报告不作为 skill 模板——格式可随项目调整，但上述"必须包含"项不得缺失。

## 常见陷阱

**Phase 2 调参前、Phase 4 编码前必读：** [`references/pitfalls.md`](references/pitfalls.md)（14 条高频错误：ESO 符号、转速单位、反电动势饱和、EMChart 硬编码、VSD 矩阵不一致、REAL 重定义等）。

## 参考文件

按需查阅的详细内容已拆到 `references/`，主流程在对应触发点给出必读链接：

| 文件 | 何时读 |
|------|--------|
| [`references/dsp-deployment.md`](references/dsp-deployment.md) | Phase 3 审批门通过、进入 Phase 4 DSP 部署前 |
| [`references/pitfalls.md`](references/pitfalls.md) | Phase 2 调参前、Phase 4 编码前 |
| [`references/experience-mechanism.md`](references/experience-mechanism.md) | 有新发现需写入经验时 |

## Agent 类型

本 skill 使用三种专用子 Agent，由主 Agent 按 P1 顺序派发：

| Agent | 执行阶段 | 输入 | 核心任务 |
|-------|---------|------|---------|
| **research agent** | Phase 1 | 论文 + DSP 工程 + 仿真模板 | 提取算法公式、推导离散化、输出完整设计文档 |
| **Simulink agent** | Phase 2 | Phase 1 设计文档 + 仿真模板 | 搭建/修改 Simulink 模型、扫参调参、输出仿真结果 |
| **DSP agent** | Phase 4 | Phase 1 设计文档 + Phase 2-3 仿真结果 + DSP 工程 | 生成 C 代码、自检、集成到 ISR、输出部署报告 |

每个 Agent 遇到不确定信息时必须执行 P1 不确定性上报，不得猜测。

## 子技能

| 技能 | 关系 | 用途 |
|------|------|------|
| brainstorming | **必需** | Phase 1 澄清流程——逐轮挖掘用户需求 |
| writing-plans | **必需** | Phase 1 设计文档完成后，生成结构化实现计划 |
| verification-before-completion | **必需** | 每个 Phase 结束时验证产出物 |
| chinese-documentation | 可选 | 设计文档需要正式排版时调用 |
