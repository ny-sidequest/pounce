// Runtime config. Leave statsUrl empty to use the built-in mock stats and the local telemetry outbox.
// Set it to the backend base URL (no trailing slash), e.g. 'https://api.example.com/pounce', to go live.
export const CONFIG = {
  statsUrl: '',
  // false = early build (footer says so); true = launch copy
  launch: false,
  shareUrl: 'ny-sidequest.github.io/pounce'
};
