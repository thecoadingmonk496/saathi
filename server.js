// For backwards compatibility: if the user runs `node server.js` from the root,
// it starts the new backend server.

const { spawn } = require('child_process');
const path = require('path');

console.log("Starting new SAATHI backend...");

const backendProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (err) => {
  console.error('Failed to start backend process:', err);
});
