// ============================================================
// Connect Four — Web Worker
// Runs the alpha-beta solver off the main thread so the UI
// stays responsive during "thinking" on Hard / Perfect modes.
// ============================================================
'use strict';

importScripts('solver.js');

self.onmessage = function (e) {
  const { state, player, difficulty, timeLimitMs } = e.data;
  const col = c4GetBestMove(state, player, difficulty, timeLimitMs || 5000);
  self.postMessage({ col });
};
