interface BreakReminderOverlayWindow extends Window {
  breakReminder: {
    completeBreak(): void;
  };
}

declare const window: BreakReminderOverlayWindow;

document.getElementById("skip-btn")?.addEventListener("click", () => {
  window.breakReminder.completeBreak();
});
