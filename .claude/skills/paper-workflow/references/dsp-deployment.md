# Phase 4: DSP 部署

> 本文件由 paper-workflow 主流程在 Phase 3 审批门通过后引用。进入 DSP 部署前必读。

## 4a. 算法代码生成

两个文件：
- `xxx.h` — struct 定义（状态/参数/I/O）+ 函数声明 + extern 实例 + 头文件保护
- `xxx.c` — init（设默认参数、清零状态）+ calc（ESO+控制律+饱和）+ xy_control（读 `<CTRL_STRUCT>`.I、写 `<CTRL_STRUCT>`.O）

匹配项目风格：`<REAL_TYPE>` 类型、fabsf/sqrtf、struct 命名约定、全局 `<CTRL_STRUCT>` 结构体。

**关键注意事项：**
- .c 中的 Ts 默认值必须与 DSP 项目的 `<TS_MACRO>` 一致；如果 `<TS_MACRO>` 定义在 `<CONFIG_HEADER>` 中，初始化时用 `p->Ts = <TS_MACRO>` 而非硬编码
- vlim 同理由母线电压推导，不可写死数值。应 `p->vlim = Udc / sqrtf(3.0f)`，Udc 取工程实际定义的母线电压（优先用已有宏；若工程未定义母线电压宏，则在 `<CONFIG_HEADER>` 新增一个，不要在算法 .c 里写裸数值）；避免出现 `p->vlim = 230.94f;` 这类硬编码——换母线电压后会失配
- sign_f 函数需处理 x=0 返回 0，避免积分器漂移

## 4b. 中断集成

找到 PWM ISR 中的控制调用点（`<ISR_CTRL_FN>` 或类似函数），定位 xy 轴控制段。

**条件编译模式（推荐）：** 在 `<CONFIG_HEADER>` 中定义宏，保留原 PI 代码供对比：

```c
// <CONFIG_HEADER>
#define <ENABLE_MACRO>  1  // 1 = 新算法, 0 = original PI

// <CTRL_SRC> 中 <ISR_CTRL_FN>():
#if <ENABLE_MACRO>
    <ALGO_ENTRY_FN>();
#else
    // 原 PI 代码保留（<PI_FALLBACK_CODE>）
#endif
```

确保时序：电流采样完成 → 算法计算 → 结果写入 udq_cmd → PWM 更新。算法调用必须在 Fbk 赋值之后、udq_cmd 被 PWM 模块读取之前。

> **运行时切换：** `#define` 宏只能在编译时切换，无法在 CCS Watch Window 中实时修改。如需上机实时 A/B 对比，改用 `<RUNTIME_MODE_VAR>`（1=新算法, 0=PI），在 `<ISR_CTRL_FN>()` 中用 `if` 分支。宏方案适合发布固化；volatile 方案适合调试调参。

## 4c. 集成检查清单

- [ ] init 函数在工程初始化序列中调用（在控制器 init 之后）
- [ ] ISR 中调用在 Fbk 赋值之后、udq_cmd 使用之前
- [ ] 饱和保护生效（vlim 匹配实际 Udc）
- [ ] vlim 与 Ts 均由宏推导，非硬编码（核对 .c 中 vlim/Udc/Ts 与 `<CONFIG_HEADER>` 一致）
- [ ] 防积分饱和——STSM 的 v 积分器在饱和时应停止积分
- [ ] DAC 观测通道不冲突（建议分配：`<DAC_CHANNELS>`）
- [ ] CCS 项目已添加 .c 文件
- [ ] `#include "<ALGO_FILES>.h"` 已添加到 `<MAIN_HEADER>` 或对应头文件
- [ ] 编译通过，零 warning

## 4d. 硬件安全门

DSP 上机属于高风险物理操作。进入 4e 上机验证前，必须逐项确认：

- [ ] **低压/空载首测：** 首次上电用低压（如 Udc=50V）或空载，确认算法不失控后再升压加载
- [ ] **电流限幅：** 确认 `vlim` 和硬件过流保护阈值已设置（不超过电机/驱动器额定电流的 1.5 倍）
- [ ] **速度斜坡：** 转速参考使用斜坡函数（非阶跃），斜率 ≤ 额定转速/秒
- [ ] **急停可用：** 确认急停按钮/IO 已连接且功能正常
- [ ] **PWM 先禁能验证变量：** 上电后先在 PWM 禁能状态下通过 CCS Watch Window 验证各变量初始值正确，再使能 PWM
- [ ] **DAC 缩放检查：** DAC 输出缩放系数与实际电压/电流范围匹配，避免示波器过压
- [ ] **过流保护确认：** 硬件过流保护（CMPSS/Trip-Zone）已配置并测试
- [ ] **示波器探头安全：** 差分探头隔离等级足够；探头地线不形成对地短路回路

## 4e. 上机验证与回退

**验证：** 通过 DAC 观测 z2（应显示 6fe 正弦）、Out（应在 vlim 内）、Fbk（RMS 应与仿真可比）。偏差 >5% 时先查 `<TS_MACRO>`。推荐通过 SCI/CAN 上传原始数据到 PC 做 MATLAB 离线 FFT 对比。

**回退：** 条件编译方案——`#define <ENABLE_MACRO> 0` 重新编译即切回原 PI；运行时方案——CCS Watch Window 中将 `<RUNTIME_MODE_VAR>` 写 0。判断标准：THD 比仿真差 >10%、持续饱和、或电机异常啸叫。**绝不删除原 PI 代码段。**
