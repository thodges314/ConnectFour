// ============================================================
// Connect Four — Pure JS alpha-beta solver
// Compatible with both main thread and Web Worker contexts.
// ============================================================
/* global self */
'use strict';

const C4_COLS = 7;
const C4_ROWS = 6;
// Center-first column order — crucial for alpha-beta efficiency
const C4_MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

// ---- Board ------------------------------------------------

class C4Board {
  constructor() { this.reset(); }

  reset() {
    // grid[row][col]  row 0 = bottom, row 5 = top
    this.grid = [];
    for (let r = 0; r < C4_ROWS; r++) this.grid.push(new Int8Array(C4_COLS));
    this.heights = new Int32Array(C4_COLS); // next empty row per col
    this.moveCount = 0;
  }

  fromState(s) {
    this.reset();
    for (let r = 0; r < C4_ROWS; r++)
      for (let c = 0; c < C4_COLS; c++)
        this.grid[r][c] = s.grid[r][c];
    for (let c = 0; c < C4_COLS; c++) this.heights[c] = s.heights[c];
    this.moveCount = s.moveCount;
    return this;
  }

  canPlay(col) { return col >= 0 && col < C4_COLS && this.heights[col] < C4_ROWS; }

  play(col, player) {
    const row = this.heights[col];
    this.grid[row][col] = player;
    this.heights[col]++;
    this.moveCount++;
  }

  undo(col) {
    this.heights[col]--;
    this.grid[this.heights[col]][col] = 0;
    this.moveCount--;
  }

  // Check win by hypothetically placing at col for player (non-destructive)
  isWinningMove(col, player) {
    if (!this.canPlay(col)) return false;
    const row = this.heights[col];
    this.grid[row][col] = player; // temp place
    const win = this._check4(col, row, player);
    this.grid[row][col] = 0;
    return win;
  }

  _check4(col, row, player) {
    const g = this.grid, p = player;
    // Horizontal
    let cnt = 1;
    for (let c = col - 1; c >= 0 && g[row][c] === p; c--) cnt++;
    for (let c = col + 1; c < C4_COLS && g[row][c] === p; c++) cnt++;
    if (cnt >= 4) return true;
    // Vertical
    cnt = 1;
    for (let r = row - 1; r >= 0 && g[r][col] === p; r--) cnt++;
    if (cnt >= 4) return true;
    // Diagonal ↗
    cnt = 1;
    for (let d = 1; col-d >= 0 && row-d >= 0 && g[row-d][col-d] === p; d++) cnt++;
    for (let d = 1; col+d < C4_COLS && row+d < C4_ROWS && g[row+d][col+d] === p; d++) cnt++;
    if (cnt >= 4) return true;
    // Diagonal ↘
    cnt = 1;
    for (let d = 1; col-d >= 0 && row+d < C4_ROWS && g[row+d][col-d] === p; d++) cnt++;
    for (let d = 1; col+d < C4_COLS && row-d >= 0 && g[row-d][col+d] === p; d++) cnt++;
    return cnt >= 4;
  }

  isFull() { return this.moveCount === C4_COLS * C4_ROWS; }
}

// ---- Negamax ----------------------------------------------

let _nodeCount = 0;
let _deadline = 0;
let _timedOut = false;

// Score convention:
//   positive = current player wins (higher = faster win)
//   0        = draw
//   negative = current player loses (lower = faster loss)
function negamax(board, player, opponent, alpha, beta, depth) {
  if (_timedOut) return 0;
  if ((_nodeCount++ & 8191) === 0 && _deadline && Date.now() > _deadline) {
    _timedOut = true;
    return 0;
  }

  if (board.isFull()) return 0;

  // Immediate win?
  for (const col of C4_MOVE_ORDER) {
    if (board.canPlay(col) && board.isWinningMove(col, player)) {
      return Math.floor((C4_COLS * C4_ROWS + 1 - board.moveCount) / 2);
    }
  }

  // Tighten upper bound
  const maxScore = Math.floor((C4_COLS * C4_ROWS - 1 - board.moveCount) / 2);
  if (beta > maxScore) {
    beta = maxScore;
    if (alpha >= beta) return beta;
  }

  if (depth === 0) return 0; // depth limit — treat unknown as draw

  for (const col of C4_MOVE_ORDER) {
    if (!board.canPlay(col)) continue;
    board.play(col, player);
    const score = negamax(board, opponent, player, -beta, -alpha, depth - 1);
    board.undo(col);
    if (_timedOut) return 0;
    const myScore = -score;
    if (myScore >= beta) return beta;
    if (myScore > alpha) alpha = myScore;
  }
  return alpha;
}

// ---- Public API -------------------------------------------

function c4GetBestMove(state, playerNum, difficulty, timeLimitMs = 5000) {
  const board = new C4Board().fromState(state);
  const player   = playerNum;
  const opponent = player === 1 ? 2 : 1;

  // Easy: mostly random, but seizes obvious wins/blocks 50% of the time
  if (difficulty === 'easy') {
    if (board.isWinningMove !== undefined) {
      for (const col of C4_MOVE_ORDER)
        if (board.canPlay(col) && board.isWinningMove(col, player)) return col;
      if (Math.random() < 0.6) { // only block 60% of the time
        for (const col of C4_MOVE_ORDER)
          if (board.canPlay(col) && board.isWinningMove(col, opponent)) return col;
      }
    }
    const legal = C4_MOVE_ORDER.filter(c => board.canPlay(c));
    return legal[Math.floor(Math.random() * legal.length)];
  }

  // Always take an immediate win or block an immediate loss
  for (const col of C4_MOVE_ORDER)
    if (board.canPlay(col) && board.isWinningMove(col, player)) return col;
  for (const col of C4_MOVE_ORDER)
    if (board.canPlay(col) && board.isWinningMove(col, opponent)) return col;

  // First move optimization: center is always optimal
  if (board.moveCount === 0 || board.moveCount === 1) {
    if (board.canPlay(3)) return 3;
  }

  const maxDepth = difficulty === 'moderate' ? 6 :
                   difficulty === 'hard'     ? 12 : 42;

  _deadline  = (difficulty === 'perfect') ? Date.now() + timeLimitMs : 0;
  _timedOut  = false;
  _nodeCount = 0;

  let bestCol = C4_MOVE_ORDER.find(c => board.canPlay(c));

  // Iterative deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let iterBestCol   = bestCol;
    let iterBestScore = -Infinity;
    _timedOut = false;

    for (const col of C4_MOVE_ORDER) {
      if (!board.canPlay(col)) continue;
      board.play(col, player);
      const score = negamax(board, opponent, player, -Infinity, Infinity, depth - 1);
      board.undo(col);
      if (_timedOut) break;
      const myScore = -score;
      if (myScore > iterBestScore) {
        iterBestScore = myScore;
        iterBestCol   = col;
      }
    }

    if (!_timedOut) {
      bestCol = iterBestCol;
      // Found a forced win — no need to search deeper
      if (iterBestScore >= Math.floor((C4_COLS * C4_ROWS + 1 - board.moveCount) / 2)) break;
    } else {
      break; // use best result from last complete iteration
    }
  }

  return bestCol;
}

// Export for both module (Node) and worker (importScripts) contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { C4Board, c4GetBestMove, C4_COLS, C4_ROWS, C4_MOVE_ORDER };
}
/* exported C4Board, c4GetBestMove */
