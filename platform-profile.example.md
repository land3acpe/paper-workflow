# 平台适配层（示例 / 本工程真实值）

> **这是什么：** paper-workflow skill 的方法论是通用的，但正文里出现的工程名、Simulink 块名、DSP 代码符号、宏、基线数值都是平台特定的。本文件把这些特定值集中成一张映射表。
>
> **怎么用（开源 fork 者）：** 复制本文件为 `platform-profile.md`，把"实际值"列换成你自己工程的值。skill 正文中出现的 `<占位符>` 一律按此表替换；表中没有、或仍是占位符的，**停下来问用户，不要猜**。
>
> **本文件内容：** 当前双三相 VSD 平台（`M_DualThree_VSD_FOC`）的真实配置，作为填写范例。

## 1. 工程与文件

| 占位符 | 实际值 | 说明 |
|--------|--------|------|
| `<PROJECT_DIR>` | `M_DualThree_VSD_FOC` | DSP 工程根目录名 |
| `<CONFIG_HEADER>` | `ACMConfig.h` | 含 `CL_TS`、电机参数宏、使能宏 |
| `<MAIN_HEADER>` | `ACMSim.h` | 含 `typedef float32 REAL;`、全局 `CTRL` 声明、算法头文件 include 处 |
| `<CTRL_SRC>` | `pmsm_controller.c` | 含 ISR 控制调用点 |
| `<ALGO_FILES>` | `stsm_leso.h` / `stsm_leso.c` | 移植算法的头/源文件 |
| `<DESIGN_DOC_DIR>` | `docs/superpowers/specs/` | Phase 1 设计文档保存位置 |
| `<EXPERIENCE_FILE>` | `docs/superpowers/experience.md` | 项目特定经验记录 |

## 2. Simulink 顶层块（以读取到的 .slx 为准，下为当前参考模型命名）

| 占位符 | 实际块名 | 改什么 |
|--------|----------|--------|
| `<VDC_BLOCK>` | `Vdc1` | 母线电压值 |
| `<LOAD_TORQUE_BLOCK>` | `TorqueCmd_Zero` | 负载转矩 |
| `<SPEED_REF_BLOCK>` | `Speed_Ref`（链路 Step→ZOH→Speed_Controller） | 转速参考值 |
| `<CURRENT_CTRL_PATH>` | `Current_Controller` | xy 控制器子系统所在层 |
| `<XY_ALGO_BLOCKS>` | `ix_ESO` / `iy_ESO` | 被新算法替换的原 xy 子系统 |
| `<PWM_GEN_BLOCKS>` | `PWM Generator ABC` / `PWM Generator XYZ` | fsw 参数 |
| 参考模型文件 | `simulink/DTP_PMSMelec_FOC_ESO.slx`（原）/ `..._STSM_LESO.slx`（新） | 复制重命名后的工作模型 |

## 3. DSP 代码符号

| 占位符 | 实际符号 | 说明 |
|--------|----------|------|
| `<ISR_CTRL_FN>` | `null_d_control()` | PWM ISR 中的控制调用点 |
| `<ALGO_ENTRY_FN>` | `stsm_leso_xy_control()` | 算法入口（读 CTRL.I、写 CTRL.O） |
| `<ALGO_INIT_FN>` | `stsm_leso_init()` | 初始化（在 `init_experiment()` 中、`init_CTRL()` 之后调用） |
| `<CTRL_STRUCT>` | 全局 `CTRL`，输入 `CTRL.I->idq[...]`、输出 `CTRL.O` | 控制器 I/O 结构体 |
| `<REAL_TYPE>` | `REAL`（`typedef float32 REAL;` 定义在 `ACMSim.h`；`stsm_leso.h` 另有 `#ifndef REAL/#define REAL float` 防护，二者当前因 `float32==float` 而等价共存，见陷阱 #14） | 浮点类型别名 |
| `<TS_MACRO>` | `CL_TS`（= `0.0001`，即 10 kHz） | 控制周期宏 |
| `<ENABLE_MACRO>` | `XY_CONTROLLER_STSM_LESO`（1=新算法, 0=原 PI） | 条件编译开关 |
| `<RUNTIME_MODE_VAR>` | `volatile uint16_t g_xy_controller_mode` | 运行时 A/B 切换变量 |
| `<PI_FALLBACK_CODE>` | `pid2_id` / `pid2_iq`（`CTRL.I->idq[0+2]` 等） | 保留的原 PI 代码段（绝不删除） |
| `<DAC_CHANNELS>` | z2（扰动估计）/ Out（控制电压）/ Fbk（电流反馈） | DAC 观测通道分配 |

## 4. 基线数值与参考工况（仅作初值参考，实际以工程 params / ACMConfig.h 为准）

| 量 | 本工程值 | 来源 / 说明 |
|----|---------|------------|
| 母线电压 Udc | 400 V | 工程**无专门母线电压宏**；vlim 由此推导 |
| vlim | 230.94 (= 400/√3) | 当前 `stsm_leso.c` 中硬编码——属待整改项（见正文 4a） |
| CL_TS | 1e-4 | `ACMConfig.h:207` |
| b0 = 1/Lz | 238.095 | → Lz ≈ 4.2 mH |
| omega_o | 4000 | 扫参范围 [1000, 64000]，优先级 ★★ |
| lam1 | 20000 | 扫参范围 [5000, 200000]，优先级 ★★★ |
| lam2 | 2e6 | 扫参范围 [5e5, 2e7]，优先级 ★★★ |
| 已验证工况 | THD=9.51% @ 720 rpm | Rs=1.75, Lz=4.2mH, Udc=400V, Fsw=10kHz |
| 电机参数 Rs/Ld/Lq/Lz/Flux/Pn | 见 `ACMConfig.h` 宏（`U_MOTOR_R` 等） | 不在此写死，从 PMSM block / 宏实际读取 |

> **数值类提醒：** lam1/lam2/omega_o 是针对本电机（Lz=4.2mH）调出的；换电机后按陷阱 #9「有效增益 = Lz × lam」反比缩放，不可直接照搬。

## 5. 占位符总清单（供正文 B 阶段替换核对）

工程/文件：`<PROJECT_DIR>` `<CONFIG_HEADER>` `<MAIN_HEADER>` `<CTRL_SRC>` `<ALGO_FILES>` `<DESIGN_DOC_DIR>` `<EXPERIENCE_FILE>`
Simulink：`<VDC_BLOCK>` `<LOAD_TORQUE_BLOCK>` `<SPEED_REF_BLOCK>` `<CURRENT_CTRL_PATH>` `<XY_ALGO_BLOCKS>` `<PWM_GEN_BLOCKS>`
DSP 符号：`<ISR_CTRL_FN>` `<ALGO_ENTRY_FN>` `<ALGO_INIT_FN>` `<CTRL_STRUCT>` `<REAL_TYPE>` `<TS_MACRO>` `<ENABLE_MACRO>` `<RUNTIME_MODE_VAR>` `<PI_FALLBACK_CODE>` `<DAC_CHANNELS>`
