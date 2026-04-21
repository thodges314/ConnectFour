// ============================================================
// Connect Four — Web Worker
// Attempts to use the high-performance WASM engine if available,
// falling back to the pure JS solver otherwise.
// ============================================================
'use strict';

// 1. Load JS Fallback
importScripts('solver.js');

let wasmModule = null;
const wasm = {
  reset:        null,
  play:         null,
  getBestMove:  null,
  getMoveCount: null
};

// 2. Attempt to load WASM Bridge (Emscripten generates engine.js)
try {
  importScripts('engine.js');
  if (typeof createEngineModule === 'function') {
    createEngineModule().then(module => {
      wasmModule = module;
      wasm.reset        = module.cwrap('reset', 'void', []);
      wasm.play         = module.cwrap('play', 'number', ['number']);
      wasm.getBestMove  = module.cwrap('getBestMove', 'number', ['number']);
      wasm.getMoveCount = module.cwrap('getMoveCount', 'number', []);
      console.log('C4 Worker: WASM engine initialised successfully.');
    }).catch(err => {
      console.error('C4 Worker: WASM init failed, using JS fallback:', err);
    });
  }
} catch (e) {
  // engine.js not found - this is expected if user hasn't run 'make wasm'
  console.log('C4 Worker: WASM bridge not found, using JS fallback.');
}

/**
 * Rebuilds the WASM bitboard state by replaying moves from the JS grid.
 * Any move order that respects gravity and alternates players is valid.
 */
function syncWasmState(state, targetPlayer) {
  if (!wasm.reset) return false;
  wasm.reset();

  // Create a deep copy of heights to track our progress as we "replay"
  const h = [0, 0, 0, 0, 0, 0, 0];
  const grid = state.grid; // grid[row][col], 0=empty, 1=P1, 2=P2
  let piecesToPlace = state.moveCount;
  let pTurn = 1; // WASM bridge always starts with P1

  while (piecesToPlace > 0) {
    let placed = false;
    for (let c = 0; c < 7; c++) {
      const row = h[c];
      if (row < 6 && grid[row][c] === pTurn) {
        wasm.play(c);
        h[c]++;
        pTurn = (pTurn === 1 ? 2 : 1);
        piecesToPlace--;
        placed = true;
        break; 
      }
    }
    if (!placed) {
      // If we can't find a move for the current player that matches gravity,
      // the board state might be "teleported" or invalid. 
      // Fallback to JS as a safety measure.
      return false;
    }
  }

  // Final check: Is it the right player's turn relative to the requested move?
  // (In C++, getBestMove solves for the current player in the internal state)
  return true;
}

// Map string difficulty to the integer expected by C++ Bridge
const DIFF_MAP = { 'easy': 0, 'moderate': 1, 'hard': 2, 'perfect': 3 };

self.onmessage = function (e) {
  const { state, player, difficulty, timeLimitMs } = e.data;

  // Attempt WASM if ready
  if (wasmModule && wasm.getBestMove) {
    try {
      if (syncWasmState(state, player)) {
        const diffInt = DIFF_MAP[difficulty] ?? 2;
        const col = wasm.getBestMove(diffInt);
        self.postMessage({ col, engine: 'wasm' });
        return;
      }
    } catch (err) {
      console.warn('C4 Worker: WASM search failed, falling back to JS.', err);
    }
  }

  // JS Fallback
  const col = c4GetBestMove(state, player, difficulty, timeLimitMs || 5000);
  self.postMessage({ col, engine: 'js' });
};
