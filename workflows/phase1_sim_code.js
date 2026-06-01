export const meta = {
  name: 'phase1-sim-code',
  description: 'Generate MATLAB simulation code (params script + function block) for your algorithm',
  phases: [
    { title: 'Generate Files', detail: 'Write params script and algorithm function' }
  ]
}

// Set your simulink directory relative to project root
const PROJECT_ROOT = process.env.PAPER_WORKFLOW_ROOT || '.'
const SIMULINK_DIR = `${PROJECT_ROOT}/simulink`

phase('Generate Files')

const result = await agent(`
You need to create two MATLAB files for the control algorithm to be deployed.

## Input
- Algorithm equations (from Phase 1 design doc)
- Motor parameters (from platform-profile.md / reference model)
- Control parameters (from Phase 1 formula derivation)

## Task: Create two files

### File 1: ${SIMULINK_DIR}/<algo_name>_params.m
A MATLAB parameter initialization script. When run, it defines all workspace variables needed by the Simulink model.

Structure it with clear sections:
- %% Motor Parameters
- %% Simulation Parameters
- %% Controller Parameters
- %% Limits and Offsets

### File 2: ${SIMULINK_DIR}/<algo_name>_control.m
A MATLAB function for use as a Simulink MATLAB Function Block.

Requirements:
- Use persistent variables for all controller states
- Initialize all persistent vars to 0 on first call (isempty check)
- Apply saturation at the end
- Add a header comment block explaining inputs/outputs

Write both files using the Write tool.
`, { label: 'Write simulation code files' })

return { result }
