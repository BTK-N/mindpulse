import { spawn } from 'node:child_process';

let failCount = 0;

function startTunnel() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Connecting Serveo tunnel for mindpulse...`);
  
  const child = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-o', 'ExitOnForwardFailure=yes',
    '-R', 'mindpulse:80:127.0.0.1:5173',
    'serveo.net'
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (d) => {
    process.stdout.write(`[Serveo STDOUT] ${d}`);
    failCount = 0;
  });

  child.stderr.on('data', (d) => {
    process.stderr.write(`[Serveo STDERR] ${d}`);
  });

  child.on('exit', (code, signal) => {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${new Date().toISOString()}] Serveo tunnel exited (code: ${code}, uptime: ${durationSec}s).`);
    
    // If it ran for more than 30 seconds, it was an active connection that just dropped; wait 15s to clear TIME_WAIT
    // If it failed quickly (< 10s), back off by 20-30s
    let delayMs = 15000;
    if (durationSec < 10) {
      failCount++;
      delayMs = Math.min(30000, 15000 + failCount * 5000);
    } else {
      failCount = 0;
    }
    
    console.log(`[${new Date().toISOString()}] Reconnecting in ${Math.round(delayMs / 1000)}s...`);
    setTimeout(startTunnel, delayMs);
  });

  child.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Serveo spawn error:`, err.message);
    setTimeout(startTunnel, 15000);
  });
}

startTunnel();
