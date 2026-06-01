# STSM+LESO 工作流脚本

论文算法部署流水线：Paper → Simulink → DSP

## 使用方法

在 Claude Code 中按顺序执行（每个 Phase 之间可以审查和调整）：

```
workflow workflows/phase1_sim_code.js
# → 审查生成的 .m 文件
workflow workflows/phase2_model_create.js
# → 审查仿真结果
workflow workflows/phase3_dsp_code.js
# → 审查 C 代码
```

## Phase 说明

| Phase | 脚本 | 输入 | 输出 | 人工检查点 |
|-------|------|------|------|-----------|
| 0 | (对话中完成) | 论文 tex/pdf | 算法方程提取 | 确认算法理解正确 |
| 1 | phase1_sim_code.js | 算法方程 + 电机参数 | stsm_leso_params.m, stsm_leso_xy.m | 确认代码逻辑 |
| 2 | phase2_model_create.js | Phase1 产出 + 原模型 | 新 .slx 模型 + 仿真结果 | 确认仿真效果 |
| 3 | phase3_dsp_code.js | 验证通过的算法 | stsm_leso.c, stsm_leso.h | 代码审查 |

## 算法参数（Phase 0 提取结果）

- 电机：Rs=1.7Ω, Ld=Lq=5.8mH, Lz=1.9mH, ψf=0.173Wb, Pn=5, Vdc=120V
- 采样：Ts=100μs (10kHz PWM)
- ESO：ω_o=5000 rad/s, β1=10000, β2=25e6, b0=526.3
- STSM：λ1=20000, λ2=2e6
