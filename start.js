// Launcher script: unsets ELECTRON_RUN_AS_NODE before starting Electron
// (VS Code and some tools set this variable, breaking Electron apps)

const { spawn } = require('child_process');
const path = require('path');

// Build clean env WITHOUT ELECTRON_RUN_AS_NODE
const cleanEnv = Object.assign({}, process.env);
delete cleanEnv.ELECTRON_RUN_AS_NODE;

// Resolve electron path BEFORE deleting the var
// (require('electron') needs ELECTRON_RUN_AS_NODE to return the path string)
const electronPath = require('electron');

const child = spawn(electronPath, ['.'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: cleanEnv
});

child.on('close', (code) => process.exit(code || 0));
