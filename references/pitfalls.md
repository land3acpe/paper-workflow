# 常见陷阱

> 本文件由 paper-workflow 主流程引用。Phase 2 调参前、Phase 4 编码前各必读一遍。

以下为本流程中高频出现的错误：

| # | 陷阱 | 症状 | 预防 |
|---|------|------|------|
| 1 | **ESO 误差符号不一致** | THD 比开环还差，扰动补偿反相 | 明确约定 `e1 = i_meas − z1`，控制律中 z2 前馈用 `−z2` |
| 2 | **转速单位混用** | 电机转速完全不对 | 确认 `<SPEED_REF_BLOCK>` 用的是 rpm（经 pi/30 转换）还是 rad/s（直接） |
| 3 | **反电动势饱和** | 转速上不去、THD 突增 | 先算：E_peak = Flux×Pn×ω_mech，确保 E_peak + 控制电压 < vlim |
| 4 | **轻载时 THD 无意义** | THD > 100% | iq 接近零时分母太小，必须带负载（至少半载）再算 THD |
| 5 | **EMChart 参数硬编码** | 改了 workspace 参数但仿真结果不变 | EMChart 内的变量是独立脚本，不会自动读取 workspace；需用 sfroot 程序化修改或确保 chart 脚本从 workspace 读取 |
| 6 | **InitFcn 相对路径** | 从不同目录打开模型时报错找不到 params.m | 一律用绝对路径：`run('C:/.../xxx_params.m')` |
| 7 | **变量覆盖** | 参数文件定义了与模型内部同名的变量，互相覆盖 | params 文件中的变量名加前缀（如 `stsm_lam1`），避免与 dq 轴控制器参数重名 |
| 8 | **DSP 代码 Ts 不匹配** | DSP 跑出来的 THD 与仿真差很多 | 检查 .c 中 `p->Ts` 的默认值是否等于实际 `<TS_MACRO>` |
| 9 | **STSM 有效增益理解错误** | 换电机参数后 THD 恶化 | 实际增益 = Lz × lam（因为 u = Lz × lam × sign(s) + ...），需按 Lz 反比缩放 lam |
| 10 | **PWM fsw 与 Ts 不匹配** | 模型报错 "Sample time must be ≤ 1/(10×fsw)" | Tsimu ≤ 1/(10×fsw)，多速率时检查各级 sample time |
| 11 | **端口未连接警告** | 黄色警告但模型能跑 | pi/30 Gain 块输出悬空等——虽不影响仿真但会污染诊断信息，应接 Terminator 或删除 |
| 12 | **VSD 变换矩阵不一致** | xy 电流始终有直流偏移 | 仿真和 DSP 用同一套 VSD 变换（确认 T6→T2 是否转置、6 相到 αβ 的 Clarke 矩阵是否一致、相序 ABC-XYZ 还是 ABC-ZXY） |
| 13 | **DSP 浮点精度不足** | 长时间运行后 ESO 状态漂移 | float(32-bit) 对 `<TS_MACRO>` 量级的极小增量可能累积舍入误差；关键积分器（z1, z2, v）考虑用 double 存储，或加入定期复位机制（如每 10 秒将 v 归零后重新建立） |
| 14 | **REAL 类型别名与宏别名并存** | 当前不报错，但写法脆弱：换 typedef 目标后会静默类型不一致 | `<MAIN_HEADER>` 已 `typedef float32 <REAL_TYPE>;`（类型名）。算法头文件里的 `#ifndef <REAL_TYPE> / #define <REAL_TYPE> float` 检测的是宏、检测不到该 typedef，于是 `#define` 仍生效——typedef 与宏别名并存。当前因 C2000 上 `float32==float` 恰好等价才不报错。建议算法头文件直接 `#include` 主头文件复用 typedef，去掉自带的 `#define <REAL_TYPE>`，避免哪天 float32 改成 double 时静默错位 |
