export const meta = {
  name: 'phase3-dsp-code',
  description: 'Generate C header and source files for DSP deployment (C2000 series)',
  phases: [
    { title: 'Generate Code', detail: 'Write C header and source files matching project style' },
    { title: 'Integration Guide', detail: 'Document how to integrate into existing project' }
  ]
}

const PROJECT_ROOT = process.env.PAPER_WORKFLOW_ROOT || '.'

// ============ Generate Code ============
phase('Generate Code')

const codeResult = await agent(`
Generate DSP C code for the control algorithm targeting TMS320F28377D (or your target MCU).

## Important: Read existing project code first
Before generating, read the existing DSP project to match:
- Type alias (REAL → float/double)
- Math functions (fabsf/sqrtf or fabs/sqrt)
- Struct naming convention
- Global controller struct and I/O access pattern
- Control period macro name
- Include chain pattern

## File 1: <algo_name>.h
- Header guard
- Struct definition (states, parameters, I/O)
- Function declarations (init, calc, entry point)
- Extern instances

## File 2: <algo_name>.c
- Include project headers
- Global instances
- init() — zero states, set default params
- calc() — execute one control cycle
- entry() — read from global CTRL struct, call calc, write output

## Key rules
- Ts default must match project's control period macro (use the macro, not hardcode)
- vlim must derive from bus voltage macro (use the macro, not hardcode 230.94f)
- sign_f() must handle x=0 returning 0
- Saturation must be applied at output
- Anti-windup: stop integrator accumulation when saturated

Write both files using the Write tool.
`, { label: 'Write .c and .h files' })

log('C code generated')

// ============ Integration Guide ============
phase('Integration Guide')

const guideResult = await agent(`
Create an integration guide for the generated algorithm code.

Write a file: INTEGRATION.md in the DSP project directory.

Content should cover:
1. Files added and their purpose
2. CCS (or IDE) project configuration
3. Code integration steps:
   - Include header in main header file
   - Call init in experiment initialization
   - Replace existing control loop in ISR
4. Conditional compilation setup (optional, for A/B comparison with original PI)
5. Runtime parameter tuning (via watch window)
6. DAC observation points for debugging

Write this file using the Write tool.
`, { label: 'Write integration guide' })

return {
  code: codeResult,
  guide: guideResult
}
