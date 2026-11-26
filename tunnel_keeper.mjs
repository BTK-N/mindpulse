import { spawn } from 'node:child_process';

// 1. SERVO KEEPER
function startServeo() {
  console.log(`[${new Date().toISOString()}] Connecting Serveo (mindpulse-live)...`);
  const ssh = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=10',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', 'mindpulse-live:80:127.0.0.1:5173',
    'serveo.net'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  ssh.stdout.on('data', d => process.stdout.write(`[Serveo] ${d}`));
  ssh.stderr.on('data', d => process.stderr.write(`[Serveo] ${d}`));

  ssh.on('exit', (code, signal) => {
    console.log(`[${new Date().toISOString()}] Serveo disconnected (code ${code}). Reconnecting in 15s...`);
    setTimeout(startServeo, 15000);
  });

  ssh.on('error', err => {
    console.error(`[${new Date().toISOString()}] Serveo error:`, err.message);
    setTimeout(startServeo, 15000);
  });
}

// 2. TUNNELMOLE KEEPER
function startTunnelmole() {
  console.log(`[${new Date().toISOString()}] Starting Tunnelmole...`);
  const tmole = spawn('cmd.exe', ['/c', 'npx', '--yes', 'tunnelmole', '5173'], {
    env: { ...process.env, PATH: `C:\\Users\\RAPTOR\\AppData\\Local\\Programs\\nodejs;C:\\Users\\RAPTOR\\AppData\\Local\\Programs\\Git\\cmd;${process.env.PATH}` },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  tmole.stdout.on('data', d => {
    const s = d.toString();
    const m = s.match(/https:\/\/[a-z0-9\-]+\.tunnelmole\.net/);
    if (m) {
      console.log(`\n=========================================\n[ACTIVE TUNNELMOLE URL]: ${m[0]}\n=========================================\n`);
    }
    process.stdout.write(`[Tunnelmole] ${s}`);
  });
  tmole.stderr.on('data', d => process.stderr.write(`[Tunnelmole] ${d}`));

  tmole.on('exit', (code) => {
    console.log(`[${new Date().toISOString()}] Tunnelmole exited (code ${code}). Restarting in 5s...`);
    setTimeout(startTunnelmole, 5000);
  });

  tmole.on('error', err => {
    console.error(`[${new Date().toISOString()}] Tunnelmole error:`, err.message);
    setTimeout(startTunnelmole, 5000);
  });
}

startServeo();
startTunnelmole();
