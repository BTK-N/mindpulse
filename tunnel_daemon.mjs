import { spawn } from 'node:child_process';

const sshPath = 'C:\\Windows\\System32\\OpenSSH\\ssh.exe';
const args = [
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'ServerAliveInterval=10',
  '-o', 'ServerAliveCountMax=3',
  '-o', 'TCPKeepAlive=yes',
  '-o', 'ExitOnForwardFailure=yes',
  '-R', 'mindpulse:80:127.0.0.1:5173',
  'serveo.net'
];

function startTunnel() {
  console.log(`[${new Date().toISOString()}] Connecting to serveo.net for domain mindpulse...`);
  
  const child = spawn(sshPath, args, { stdio: 'inherit' });

  child.on('close', (code) => {
    console.log(`[${new Date().toISOString()}] SSH process exited with code ${code}. Waiting 30s to ensure socket release on remote server...`);
    setTimeout(startTunnel, 30000);
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] SSH spawn error:`, err);
    setTimeout(startTunnel, 30000);
  });
}

startTunnel();
