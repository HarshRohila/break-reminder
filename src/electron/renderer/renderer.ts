import type { StatusResponse } from '../ipc.js';

interface BreakReminderWindow extends Window {
  breakReminder: {
    getStatus(): Promise<StatusResponse>;
  };
}

declare const window: BreakReminderWindow;

const WORK_DURATION_MS = 20 * 60 * 1_000;

function formatMmSs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1_000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function refresh(): Promise<void> {
  const dot = document.getElementById('state-dot') as HTMLElement;
  const label = document.getElementById('state-label') as HTMLElement;
  const subtitle = document.getElementById('state-subtitle') as HTMLElement;

  try {
    const { state, elapsedMs } = await window.breakReminder.getStatus();

    if (state === 'WORKING') {
      dot.className = 'dot working';
      label.textContent = 'Working';
      const remaining = WORK_DURATION_MS - elapsedMs;
      subtitle.textContent = `Next break in ${formatMmSs(remaining)}`;
    } else {
      dot.className = 'dot break';
      label.textContent = 'On Break';
      subtitle.textContent = 'Stay away from the screen…';
    }
  } catch {
    label.textContent = '—';
    subtitle.textContent = '';
  }
}

document.getElementById('quit-btn')?.addEventListener('click', () => {
  window.close();
});

void refresh();
setInterval(() => void refresh(), 1_000);
