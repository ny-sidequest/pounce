// Runtime config. Leave statsUrl empty to use the built-in mock stats and the local telemetry outbox.
// Set it to the backend base URL (no trailing slash), e.g. 'https://api.example.com/pounce', to go live.
export const CONFIG = {
  statsUrl: '',
  // false = early build (footer says so); true = launch copy
  launch: false,
  // which night is "tonight": days since launchDate (in rolloverTz) + 1. The rollover time is still an open decision: one value, here.
  launchDate: '2026-12-01',
  rolloverTz: 'UTC',
  // while friends test before launch: tonight = the latest puzzle, whatever the date. Set to false at launch.
  devAllNights: true,
  shareUrl: 'ny-sidequest.github.io/pounce'
};
