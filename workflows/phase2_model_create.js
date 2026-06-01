export const meta = {
  name: 'phase2-model-create',
  description: 'Create new Simulink model with your algorithm and run initial simulation',
  phases: [
    { title: 'Copy and Configure', detail: 'Copy model, update InitFcn and parameters' },
    { title: 'Modify Controller', detail: 'Replace controller subsystems with your algorithm block' },
    { title: 'Simulate', detail: 'Run simulation and analyze results' }
  ]
}

const PROJECT_ROOT = process.env.PAPER_WORKFLOW_ROOT || '.'
const SIMULINK_DIR = `${PROJECT_ROOT}/simulink`

// ============ Copy and Configure ============
phase('Copy and Configure')

const setupResult = await agent(`
Use the mcp__matlab__evaluate_matlab_code tool to execute MATLAB commands.

## Task 1: Setup
Run these commands:

1. Change to simulink directory and verify files exist:
   cd('${SIMULINK_DIR}')
   dir('*.slx')
   dir('<algo_name>_params.m')
   dir('<algo_name>_control.m')

2. Run the parameter script to verify it works:
   <algo_name>_params

3. Copy the original model to a new name:
   copyfile('<original_model>.slx', '<new_model>.slx')

4. Open the new model and set InitFcn:
   open_system('<new_model>')
   set_param('<new_model>', 'InitFcn', '<algo_name>_params')

5. Explore the model structure to find the target controller subsystems:
   subsys = find_system('<new_model>', 'SearchDepth', 4, 'BlockType', 'SubSystem');
   for i = 1:length(subsys)
       disp(subsys{i})
   end

Report the exact paths of the controller subsystems to be replaced.
`, { label: 'Setup model and explore structure' })

log('Model copied and configured')

// ============ Modify Controller ============
phase('Modify Controller')

const modifyResult = await agent(`
Use the mcp__matlab__evaluate_matlab_code tool to modify the Simulink model.

## Context
The model is open in MATLAB. The previous phase found the controller subsystem paths.

## Task: Replace or add your algorithm block in the current control path

Use MATLAB Function (EMChart) block approach:
\`\`\`matlab
rt = sfroot;
m = rt.find('-isa', 'Stateflow.Machine', 'Name', '<new_model>');
chart = m.find('-isa', 'Stateflow.EMChart', 'Name', '<chart_name>');
chart.Script = new_script_string;
save_system('<new_model>');
\`\`\`

If programmatic editing is too complex, document the manual steps needed.

Be pragmatic. Report what worked and what needs manual intervention.
`, { label: 'Modify controller in model' })

log('Controller modification phase complete')

// ============ Simulate ============
phase('Simulate')

const simResult = await agent(`
Use the mcp__matlab__evaluate_matlab_code tool to run simulation and analyze results.

## Task
1. Set simulation time and run:
   cd('${SIMULINK_DIR}')
   <algo_name>_params
   set_param('<new_model>', 'StopTime', '0.5')
   simOut = sim('<new_model>');

2. Extract and plot key signals (ix, iy, iq, control voltage)
3. Calculate THD and report results

Report the simulation results clearly.
`, { label: 'Run simulation and analyze' })

return {
  setup: setupResult,
  modify: modifyResult,
  simulation: simResult
}
