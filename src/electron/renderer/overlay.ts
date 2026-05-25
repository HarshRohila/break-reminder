interface BreakReminderOverlayWindow extends Window {
  breakReminder: {
    skipBreak(): void;
  };
}

declare const window: BreakReminderOverlayWindow;

document.getElementById('skip-btn')?.addEventListener('click', () => {
  window.breakReminder.skipBreak();
});
