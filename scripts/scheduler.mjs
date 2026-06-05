// Always-on scheduler (run under pm2) that triggers the live data refresh at
// 00:00 / 06:00 / 12:00 / 18:00 UTC — every 6 hours. Kept simple and dependency
// -free; pm2 restarts it if it ever crashes.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve refresh-live.sh next to this file so it works both under host pm2
// (/home/chris/repos/relief-v2/scripts) and inside the Docker refresh image
// (/app/scripts). Override with REFRESH_SCRIPT if needed.
const SCRIPT =
  process.env.REFRESH_SCRIPT ?? fileURLToPath(new URL('./refresh-live.sh', import.meta.url));

function runRefresh() {
  console.log(new Date().toISOString(), 'starting refresh-live');
  const p = spawn('bash', [SCRIPT], { stdio: 'inherit' });
  p.on('exit', (code) => console.log(new Date().toISOString(), 'refresh-live exited', code));
}

function msUntilNextSlot() {
  const now = new Date();
  const next = new Date(now);
  const nextHour = (Math.floor(now.getUTCHours() / 6) + 1) * 6;
  next.setUTCHours(nextHour % 24, 0, 0, 0);
  if (nextHour >= 24) next.setUTCDate(now.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

function scheduleNext() {
  const ms = msUntilNextSlot();
  console.log(new Date().toISOString(), `next refresh in ${Math.round(ms / 60000)} min`);
  setTimeout(() => {
    runRefresh();
    scheduleNext();
  }, ms);
}

console.log(new Date().toISOString(), 'refresh scheduler up (every 6h at 00/06/12/18 UTC)');
scheduleNext();
