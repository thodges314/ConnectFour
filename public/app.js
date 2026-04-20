// ============================================================
// Connect Four — D3 Game Application
// Synthwave/Nightcore aesthetic, SVG board with mask,
// physics-based drop animation, Web Worker AI.
// ============================================================
'use strict';
/* global d3, soundEngine, musicEngine, C4Board, c4GetBestMove */

// ---- Board constants --------------------------------------
const COLS   = 7;
const ROWS   = 6;
const CELL   = 82;          // px per cell
const RADIUS = 33;          // piece radius
const PAD    = 18;          // board inner padding
const DROP_H = 72;          // vertical space above board for drop zone
const BOARD_W = COLS * CELL + PAD * 2;
const BOARD_H = ROWS * CELL + PAD * 2;
const SVG_H   = DROP_H + BOARD_H;

// ---- State ------------------------------------------------
let grid       = [];        // grid[row][col]: 0, 1, 2
let heights    = [];        // next empty row per column
let moveCount  = 0;
let curPlayer  = 1;         // whose turn it is (1=P1, 2=P2)
let humanNum   = 1;         // which player number the human plays as
let aiNum      = 2;
let difficulty = 'hard';
let gameOver   = false;
let animating  = false;
let hoveredCol = -1;
let scores     = { human: 0, ai: 0, draws: 0 };
let worker     = null;

// ---- D3 selections ----------------------------------------
const svgSel    = d3.select('#game-board');
let piecesLayer, fallingLayer;

// ============================================================
// Initialisation
// ============================================================
function init() {
  buildSVG();
  initWorker();
  bindControls();

  // Register theme-change hook so piece rendering stays in sync.
  // theme.js calls this whenever the user toggles between Synthwave / Aero.
  window._c4OnThemeChange = function(newTheme) {
    // 1. Tear down every Aero overlay element (specular ellipses + rim circles).
    //    They are only meaningful in Aero mode; in Synthwave pieces use CSS fills.
    for (let rr = 0; rr < ROWS; rr++) {
      for (let cc = 0; cc < COLS; cc++) {
        const spec = document.getElementById(`spec-${cc}-${rr}`);
        if (spec) spec.remove();
        const rim  = document.getElementById(`rim-${cc}-${rr}`);
        if (rim)  rim.remove();
      }
    }
    // 2. Re-render cells with the correct style for the new theme.
    refreshCells();
    // 3. Cross-fade background music to the matching theme track.
    if (typeof musicEngine !== 'undefined') musicEngine.switchTheme();
  };

  startNewGame(true);
}

// ---- Build SVG once ----------------------------------------
function buildSVG() {
  svgSel
    .attr('viewBox', `0 0 ${BOARD_W} ${SVG_H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  // width/height are intentionally omitted here — CSS controls sizing
  // so the SVG scales fluidly on every screen size.

  const defs = svgSel.append('defs');

  // ---- Glow filter (pieces) ----
  const glow = defs.append('filter').attr('id', 'glow').attr('x','-40%').attr('y','-40%').attr('width','180%').attr('height','180%');
  glow.append('feGaussianBlur').attr('stdDeviation', 5).attr('result', 'blur');
  const gm = glow.append('feMerge');
  gm.append('feMergeNode').attr('in', 'blur');
  gm.append('feMergeNode').attr('in', 'SourceGraphic');

  // ---- Strong win-glow filter ----
  const wglow = defs.append('filter').attr('id', 'win-glow').attr('x','-60%').attr('y','-60%').attr('width','220%').attr('height','220%');
  wglow.append('feGaussianBlur').attr('stdDeviation', 10).attr('result', 'blur');
  const wm = wglow.append('feMerge');
  wm.append('feMergeNode').attr('in', 'blur');
  wm.append('feMergeNode').attr('in', 'SourceGraphic');

  // ---- Aero board frame gradient (Vista cobalt glass panel) ----
  const abg = defs.append('linearGradient')
    .attr('id', 'aero-board-gradient')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  abg.append('stop').attr('offset', '0%')  .attr('stop-color', 'rgba(210,238,255,0.88)');
  abg.append('stop').attr('offset', '48%') .attr('stop-color', 'rgba(170,215,252,0.78)');
  abg.append('stop').attr('offset', '52%') .attr('stop-color', 'rgba(140,195,245,0.75)');
  abg.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(175,220,255,0.82)');

  // ---- Aero piece P1 — Vista Scarlet Red (Go-stone disk body) ----
  // Wide diffuse top highlight → saturated face → dark rim
  const ap1 = defs.append('radialGradient')
    .attr('id', 'aero-piece-p1')
    .attr('cx', '50%').attr('cy', '36%').attr('r', '72%')
    .attr('fx', '50%').attr('fy', '22%');
  ap1.append('stop').attr('offset',  '0%').attr('stop-color', '#ff8a90');
  ap1.append('stop').attr('offset', '20%').attr('stop-color', '#e0001a');
  ap1.append('stop').attr('offset', '55%').attr('stop-color', '#b30015');
  ap1.append('stop').attr('offset', '80%').attr('stop-color', '#7a000e');
  ap1.append('stop').attr('offset','100%').attr('stop-color', '#3d0007');

  // ---- Aero piece P2 — Vista Amber Gold (Go-stone disk body) ----
  const ap2 = defs.append('radialGradient')
    .attr('id', 'aero-piece-p2')
    .attr('cx', '50%').attr('cy', '36%').attr('r', '72%')
    .attr('fx', '50%').attr('fy', '22%');
  ap2.append('stop').attr('offset',  '0%').attr('stop-color', '#ffe98a');
  ap2.append('stop').attr('offset', '20%').attr('stop-color', '#d4900a');
  ap2.append('stop').attr('offset', '55%').attr('stop-color', '#a86a00');
  ap2.append('stop').attr('offset', '80%').attr('stop-color', '#6e4000');
  ap2.append('stop').attr('offset','100%').attr('stop-color', '#3a1e00');

  // ---- Aero piece drop-shadow filter ----
  const aFilter = defs.append('filter').attr('id', 'aero-piece-shadow')
    .attr('x','-30%').attr('y','-30%').attr('width','160%').attr('height','160%');
  aFilter.append('feDropShadow')
    .attr('dx', '0').attr('dy', '2.5').attr('stdDeviation', '3.5')
    .attr('flood-color', 'rgba(0,0,0,0.32)');

  // ---- Aero piece specular — flat wide elliptical highlight for disk face ----
  // Used on an <ellipse> sized to ~55%×24% of RADIUS, not a circle.
  const aSpec = defs.append('radialGradient')
    .attr('id', 'aero-piece-spec')
    .attr('cx', '50%').attr('cy', '38%').attr('r', '55%');
  aSpec.append('stop').attr('offset',  '0%').attr('stop-color', 'rgba(255,255,255,0.82)');
  aSpec.append('stop').attr('offset', '42%').attr('stop-color', 'rgba(255,255,255,0.40)');
  aSpec.append('stop').attr('offset','100%').attr('stop-color', 'rgba(255,255,255,0.00)');

  // ---- Aero piece rim highlight — thin upper arc, stroke only ----
  // (applied in JS as a stroke-only circle element, no fill)

  // ---- Aero empty cell gradient (recessed blue hole) ----
  const aCell = defs.append('radialGradient')
    .attr('id', 'aero-cell-empty')
    .attr('cx', '42%').attr('cy', '38%').attr('r', '60%');
  aCell.append('stop').attr('offset',  '0%').attr('stop-color', 'rgba(215,240,255,0.72)');
  aCell.append('stop').attr('offset', '55%').attr('stop-color', 'rgba(155,208,248,0.58)');
  aCell.append('stop').attr('offset','100%').attr('stop-color', 'rgba( 90,162,228,0.48)');

  // ---- Board-hole mask ----
  // White rectangle = frame is opaque; black circles = holes are transparent

  // ---- Synthwave fall streak gradients ----
  // P1 (pink) — top bright, fades to transparent going up (rendered trailing behind piece)
  const sg1 = defs.append('linearGradient')
    .attr('id', 'streak-grad-p1')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  sg1.append('stop').attr('offset',  '0%').attr('stop-color', 'rgba(255,45,120,0.00)');
  sg1.append('stop').attr('offset', '60%').attr('stop-color', 'rgba(255,45,120,0.55)');
  sg1.append('stop').attr('offset','100%').attr('stop-color', 'rgba(255,45,120,0.90)');

  // P2 (cyan)
  const sg2 = defs.append('linearGradient')
    .attr('id', 'streak-grad-p2')
    .attr('x1', '0%').attr('y1', '0%')
    .attr('x2', '0%').attr('y2', '100%');
  sg2.append('stop').attr('offset',  '0%').attr('stop-color', 'rgba(0,229,255,0.00)');
  sg2.append('stop').attr('offset', '60%').attr('stop-color', 'rgba(0,229,255,0.55)');
  sg2.append('stop').attr('offset','100%').attr('stop-color', 'rgba(0,229,255,0.90)');

  const mask = defs.append('mask').attr('id', 'board-holes');
  mask.append('rect')
    .attr('x', 0).attr('y', DROP_H)
    .attr('width', BOARD_W).attr('height', BOARD_H)
    .attr('fill', 'white');
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      mask.append('circle')
        .attr('cx', cellX(c))
        .attr('cy', cellY(r))
        .attr('r',  RADIUS + 3)
        .attr('fill', 'black');
    }
  }

  // ---- Cell backgrounds (visible through holes) ----
  const cellBg = svgSel.append('g').attr('id', 'layer-cell-bg');
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cellBg.append('circle')
        .attr('id',  `cell-${c}-${r}`)
        .attr('cx',   cellX(c))
        .attr('cy',   cellY(r))
        .attr('r',    RADIUS)
        .attr('class','cell-empty');
    }
  }

  // ---- Pieces layer (permanent, below board frame) ----
  piecesLayer = svgSel.append('g').attr('id', 'layer-pieces');

  // ---- Falling piece layer ----
  fallingLayer = svgSel.append('g').attr('id', 'layer-falling');

  // ---- Board frame (with hole mask on top of pieces) ----
  svgSel.append('rect')
    .attr('id',     'board-frame')
    .attr('x',       0).attr('y', DROP_H)
    .attr('width',   BOARD_W)
    .attr('height',  BOARD_H)
    .attr('rx',      14)
    .attr('mask',   'url(#board-holes)');

  // ---- Column hover highlights (semi-opaque strip) ----
  const hoverLayer = svgSel.append('g').attr('id', 'layer-hover');
  for (let c = 0; c < COLS; c++) {
    hoverLayer.append('rect')
      .attr('id',       `hover-col-${c}`)
      .attr('x',         PAD + c * CELL)
      .attr('y',         DROP_H)
      .attr('width',     CELL)
      .attr('height',    BOARD_H)
      .attr('rx',        8)
      .attr('class',    'col-hover-strip')
      .attr('opacity',   0)
      .attr('pointer-events','none');
  }

  // ---- Ghost piece (drop indicator shown above frame) ----
  svgSel.append('circle')
    .attr('id', 'ghost-piece')
    .attr('cx', -200)
    .attr('cy',  DROP_H / 2)
    .attr('r',   RADIUS - 3)
    .attr('class','ghost-piece')
    .attr('pointer-events','none');

  // ---- Invisible click / hover areas per column ----
  const hitLayer = svgSel.append('g').attr('id', 'layer-hit');
  for (let c = 0; c < COLS; c++) {
    hitLayer.append('rect')
      .attr('x',       PAD + c * CELL)
      .attr('y',       0)
      .attr('width',   CELL)
      .attr('height',  SVG_H)
      .attr('fill',   'transparent')
      .attr('cursor', 'pointer')
      .attr('class',  'col-hit')
      .attr('data-col', c)
      .on('mouseenter', () => onEnterCol(c))
      .on('mouseleave', () => onLeaveCol(c))
      .on('click',      () => onClickCol(c));
  }
}

// ---- Coordinate helpers ------------------------------------
function cellX(col) { return PAD + col * CELL + CELL / 2; }
function cellY(row) { return DROP_H + PAD + (ROWS - 1 - row) * CELL + CELL / 2; }

// ============================================================
// Game Logic
// ============================================================
function startNewGame(silent = false) {
  // Reset state
  grid      = [];
  heights   = new Array(COLS).fill(0);
  moveCount = 0;
  curPlayer = 1;
  gameOver  = false;
  animating = false;
  hoveredCol= -1;
  for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));

  // Clear board
  clearPieces();
  clearWinHighlight();
  hideGhost();
  setStatus('');

  if (!silent) soundEngine.playClick();

  // If AI goes first (human plays as player 2)
  if (humanNum === 2) {
    // AI plays as P1, goes first
    setThinking(true);
    requestAnimationFrame(() => doAiTurn());
  } else {
    setStatus('Your turn — click a column');
  }
}

// ---- Human plays a column ---------------------------------
function onClickCol(col) {
  if (gameOver || animating) return;
  if (curPlayer !== humanNum) return;
  if (heights[col] >= ROWS) return;

  soundEngine._boot(); // ensure AudioContext is live after user gesture
  playColumn(col, humanNum, () => {
    if (processResult(col, heights[col] - 1, humanNum)) return;
    curPlayer = aiNum;
    setThinking(true);
    requestAnimationFrame(() => doAiTurn());
  });
}

// ---- AI picks a column and plays it -----------------------
function doAiTurn() {
  if (gameOver) return;

  const state = {
    grid:      grid.map(r => [...r]),
    heights:   [...heights],
    moveCount
  };

  // Easy / Moderate: fast enough on main thread
  if (difficulty === 'easy' || difficulty === 'moderate') {
    const col = c4GetBestMove(state, aiNum, difficulty);
    setTimeout(() => doAiPlay(col), difficulty === 'easy' ? 350 : 250);
    return;
  }

  // Hard / Perfect: use Web Worker
  if (worker) {
    worker.postMessage({ state, player: aiNum, difficulty, timeLimitMs: 5000 });
  } else {
    // Fallback if Worker unavailable
    const col = c4GetBestMove(state, aiNum, difficulty, 5000);
    doAiPlay(col);
  }
}

function doAiPlay(col) {
  if (gameOver) return;
  setThinking(false);
  playColumn(col, aiNum, () => {
    if (processResult(col, heights[col] - 1, aiNum)) return;
    curPlayer = humanNum;
    setStatus('Your turn — click a column');
  });
}

// ---- Actually drop a piece --------------------------------
function playColumn(col, player, callback) {
  const row = heights[col];
  soundEngine.playDrop(row);
  animateDrop(col, player, row, () => {
    // Commit to logical state
    grid[row][col] = player;
    heights[col]++;
    moveCount++;
    refreshCells();
    callback();
  });
}

// ---- Check win / draw, update score & status --------------
// Returns true if game ended
function processResult(col, row, player) {
  if (checkWin(col, row, player)) {
    gameOver  = true;
    setThinking(false);
    const cells = findWinCells(col, row, player);
    highlightWin(cells, player);

    if (player === humanNum) {
      scores.human++;
      updateScores();
      setStatus('🎉 You win!');
      soundEngine.playWin();
    } else {
      scores.ai++;
      updateScores();
      setStatus('🤖 AI wins!');
      soundEngine.playLose();
    }
    return true;
  }
  if (moveCount === COLS * ROWS) {
    gameOver = true;
    setThinking(false);
    scores.draws++;
    updateScores();
    setStatus("It's a draw!");
    soundEngine.playDraw();
    return true;
  }
  return false;
}

// ---- Win detection ----------------------------------------
function checkWin(col, row, player) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dc,dr] of dirs) {
    let cnt = 1;
    for (let d = 1; d <= 3; d++) {
      const nc=col+dc*d, nr=row+dr*d;
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS||grid[nr][nc]!==player) break;
      cnt++;
    }
    for (let d = 1; d <= 3; d++) {
      const nc=col-dc*d, nr=row-dr*d;
      if (nc<0||nc>=COLS||nr<0||nr>=ROWS||grid[nr][nc]!==player) break;
      cnt++;
    }
    if (cnt >= 4) return true;
  }
  return false;
}

function findWinCells(col, row, player) {
  const dirs = [[1,0],[0,1],[1,1],[1,-1]];
  for (const [dc,dr] of dirs) {
    const cells = [{c:col,r:row}];
    for (let d=1;d<=3;d++){
      const nc=col+dc*d,nr=row+dr*d;
      if(nc<0||nc>=COLS||nr<0||nr>=ROWS||grid[nr][nc]!==player) break;
      cells.push({c:nc,r:nr});
    }
    for (let d=1;d<=3;d++){
      const nc=col-dc*d,nr=row-dr*d;
      if(nc<0||nc>=COLS||nr<0||nr>=ROWS||grid[nr][nc]!==player) break;
      cells.unshift({c:nc,r:nr});
    }
    if (cells.length >= 4) return cells.slice(0, 4);
  }
  return [];
}

// ============================================================
// D3 Rendering
// ============================================================

// Helper — is Aero theme active?
function isAero() {
  return document.documentElement.getAttribute('data-theme') === 'aero';
}

// Approx RADIUS fractions for disk specular ellipse
const SPEC_RX_FRAC = 0.54; // horizontal — wide across disk face
const SPEC_RY_FRAC = 0.22; // vertical   — flat/thin (lens-like)
const SPEC_DY_FRAC = 0.20; // offset up from centre

// Build the Aero disk overlay elements for a settled piece.
// Parent must be an SVG element (parent of cell-bg circles).
function _buildAeroDiskOverlay(c, r, cx, cy) {
  const ns = 'http://www.w3.org/2000/svg';

  // Specular ellipse — flat highlight across the top face
  const specId = `spec-${c}-${r}`;
  if (!document.getElementById(specId)) {
    const el = document.createElementNS(ns, 'ellipse');
    el.setAttribute('id',   specId);
    el.setAttribute('cx',   cx);
    el.setAttribute('cy',   cy - RADIUS * SPEC_DY_FRAC);
    el.setAttribute('rx',   RADIUS * SPEC_RX_FRAC);
    el.setAttribute('ry',   RADIUS * SPEC_RY_FRAC);
    el.setAttribute('fill', 'url(#aero-piece-spec)');
    el.setAttribute('pointer-events', 'none');
    document.getElementById('layer-cell-bg').appendChild(el);
  }

  // Rim arc — thin stroke circle, no fill
  const rimId = `rim-${c}-${r}`;
  if (!document.getElementById(rimId)) {
    const el = document.createElementNS(ns, 'circle');
    el.setAttribute('id',           rimId);
    el.setAttribute('cx',           cx);
    el.setAttribute('cy',           cy);
    el.setAttribute('r',            RADIUS - 1);
    el.setAttribute('fill',         'none');
    el.setAttribute('stroke',       'rgba(255,255,255,0.28)');
    el.setAttribute('stroke-width', '1.5');
    el.setAttribute('pointer-events', 'none');
    document.getElementById('layer-cell-bg').appendChild(el);
  }
}

// Update cell background circles (the "empty hole" visual)
function refreshCells() {
  const aero = isAero();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v  = grid[r][c];
      const el = document.getElementById(`cell-${c}-${r}`);
      if (!el) continue;

      if (v === 0) {
        el.setAttribute('class', 'cell-empty');
        el.removeAttribute('filter');
        if (aero) el.setAttribute('fill', 'url(#aero-cell-empty)');
        else      el.removeAttribute('fill');
      } else {
        el.setAttribute('class', `cell-p${v}`);
        if (aero) {
          el.setAttribute('fill',   `url(#aero-piece-p${v})`);
          el.setAttribute('filter', 'url(#aero-piece-shadow)');
          const cx = parseFloat(el.getAttribute('cx'));
          const cy = parseFloat(el.getAttribute('cy'));
          _buildAeroDiskOverlay(c, r, cx, cy);
        } else {
          el.removeAttribute('fill');
          el.setAttribute('filter', 'url(#glow)');
        }
      }
    }
  }
}

function clearPieces() {
  const aero = isAero();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.getElementById(`cell-${c}-${r}`);
      if (el) {
        el.setAttribute('class', 'cell-empty');
        el.removeAttribute('filter');
        if (aero) el.setAttribute('fill', 'url(#aero-cell-empty)');
        else      el.removeAttribute('fill');
      }
      // Remove Aero overlay elements
      const spec = document.getElementById(`spec-${c}-${r}`);
      if (spec) spec.remove();
      const rim  = document.getElementById(`rim-${c}-${r}`);
      if (rim)  rim.remove();
    }
  }
}

// ---- Win highlight ----------------------------------------
let _pulseTimers = [];

function highlightWin(cells, player) {
  cells.forEach(({c, r}) => {
    const el = document.getElementById(`cell-${c}-${r}`);
    if (!el) return;
    el.setAttribute('class', `cell-p${player} winning`);
    el.setAttribute('filter','url(#win-glow)');
    _pulseEl(el);
  });
}

function _pulseEl(el) {
  let growing = true;
  const animate = () => {
    if (!gameOver) return;
    const target = growing ? RADIUS + 6 : RADIUS;
    d3.select(el)
      .transition().duration(450).ease(d3.easeSinInOut)
      .attr('r', target)
      .on('end', () => { growing = !growing; animate(); });
  };
  animate();
}

function clearWinHighlight() {
  _pulseTimers = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = document.getElementById(`cell-${c}-${r}`);
      if (el) {
        el.removeAttribute('filter');
        el.setAttribute('r', RADIUS);
        el.setAttribute('class', 'cell-empty');
      }
    }
  }
}

// ---- Drop animation ---------------------------------------
function animateDrop(col, player, finalRow, callback) {
  animating = true;
  hideGhost();

  const x      = cellX(col);
  const startY = DROP_H / 2;          // starts in the drop zone above board
  const endY   = cellY(finalRow);
  const dist   = endY - startY;

  // Duration scales with drop distance (physics: t ∝ √dist)
  const dur = 90 + Math.sqrt(dist) * 20;

  // Bounce magnitudes (% of fall distance, decaying)
  const b1 = dist * 0.18;   // 18% bounce — clearly visible
  const b2 = dist * 0.07;
  const b3 = dist * 0.025;

  const aero = isAero();

  // In Aero mode we build a <g> containing the disk body + specular ellipse
  // so both elements travel together under a single animated transform.
  let animTarget;   // d3 selection we'll animate (group in Aero, circle in Synthwave)
  let removeTarget; // d3 selection to remove when done
  let synthStreak = null; // narrower trailing rect used only in Synthwave

  if (aero) {
    const group = fallingLayer.append('g')
      .attr('transform', `translate(${x},${startY})`);

    // Disk body — centred at (0,0) within group
    group.append('circle')
      .attr('cx', 0).attr('cy', 0).attr('r', RADIUS)
      .attr('fill',   `url(#aero-piece-p${player})`)
      .attr('filter', 'url(#aero-piece-shadow)');

    // Flat specular ellipse — shifted up inside group
    group.append('ellipse')
      .attr('cx', 0)
      .attr('cy', -(RADIUS * SPEC_DY_FRAC))
      .attr('rx',  RADIUS * SPEC_RX_FRAC)
      .attr('ry',  RADIUS * SPEC_RY_FRAC)
      .attr('fill', 'url(#aero-piece-spec)')
      .attr('pointer-events', 'none');

    // Rim circle — stroke only, no fill
    group.append('circle')
      .attr('cx', 0).attr('cy', 0).attr('r', RADIUS - 1)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.28)')
      .attr('stroke-width', '1.5')
      .attr('pointer-events', 'none');

    // Animate the group's transform (translate Y only)
    animTarget  = group;
    removeTarget = group;
  } else {
    const piece = fallingLayer.append('circle')
      .attr('class', `piece-fall p${player}`)
      .attr('cx', x).attr('cy', startY).attr('r', RADIUS)
      .attr('filter', 'url(#glow)');

    // ── Synthwave fall streak ──
    // A narrow gradient rectangle that trails above the falling piece,
    // giving a comet/light-speed effect.  Width is ~45% of piece radius.
    const streakW = RADIUS * 0.45;
    synthStreak   = fallingLayer.append('rect')
      .attr('x',      x - streakW / 2)
      .attr('y',      startY - RADIUS)  // top edge stays fixed at drop zone
      .attr('width',  streakW)
      .attr('height', 0)
      .attr('rx',     streakW / 2)
      .attr('fill',   `url(#streak-grad-p${player})`)
      .attr('pointer-events', 'none')
      .attr('opacity', 0.78);

    animTarget   = piece;
    removeTarget = piece;
  }

  // Helper: returns the right attribute + value for the current mode.
  // Also drives the Synthwave streak in parallel when present.
  function moveTo(sel, y, duration, ease, cb) {
    if (synthStreak) {
      const currentH = parseFloat(synthStreak.attr('height')) || 0;
      if (currentH < 1) {
        // Initial fall — grow the streak to match the fall distance
        const newH = Math.max(0, y - startY - RADIUS);
        synthStreak.transition().duration(duration).ease(ease)
          .attr('height', newH);
      } else {
        // Bounce — quickly collapse and fade the streak
        synthStreak.transition().duration(duration * 0.45)
          .attr('opacity', 0)
          .attr('height',  0);
      }
    }

    if (aero) {
      sel.transition().duration(duration).ease(ease)
        .attr('transform', `translate(${x},${y})`)
        .on('end', cb);
    } else {
      sel.transition().duration(duration).ease(ease)
        .attr('cy', y)
        .on('end', cb);
    }
  }

  // Chain: fall → bounce1 up → bounce1 down → bounce2 up → bounce2 down → bounce3 → settle
  moveTo(animTarget, endY, dur, d3.easeQuadIn, () => {
    soundEngine.playBounce();
    moveTo(animTarget, endY - b1, dur * 0.22, d3.easeQuadOut, () => {
      moveTo(animTarget, endY, dur * 0.22, d3.easeQuadIn, () => {
        soundEngine.playBounce();
        moveTo(animTarget, endY - b2, dur * 0.13, d3.easeQuadOut, () => {
          moveTo(animTarget, endY, dur * 0.13, d3.easeQuadIn, () => {
            moveTo(animTarget, endY - b3, dur * 0.07, d3.easeQuadOut, () => {
              moveTo(animTarget, endY, dur * 0.07, d3.easeQuadIn, () => {
                removeTarget.remove();
                if (synthStreak) { synthStreak.remove(); synthStreak = null; }
                animating = false;
                callback();
              });
            });
          });
        });
      });
    });
  });
}

// ---- Ghost piece ------------------------------------------
function onEnterCol(col) {
  hoveredCol = col;
  // Clear all strips first
  for (let c = 0; c < COLS; c++) d3.select(`#hover-col-${c}`).attr('opacity', 0);

  if (gameOver || animating || curPlayer !== humanNum || heights[col] >= ROWS) {
    d3.select('#ghost-piece').attr('cx', -200);
    return;
  }
  soundEngine.playHover();

  d3.select('#ghost-piece')
    .attr('class', `ghost-piece p${humanNum}`)
    .attr('cx', cellX(col))
    .attr('cy', DROP_H / 2);

  // Highlight strip
  d3.select(`#hover-col-${col}`).attr('opacity', 0.09);
}

function onLeaveCol(col) {
  hoveredCol = -1;
  d3.select('#ghost-piece').attr('cx', -200);
  d3.select(`#hover-col-${col}`).attr('opacity', 0);
}

function hideGhost() {
  d3.select('#ghost-piece').attr('cx', -200);
  // Clear all hover strips
  for (let c = 0; c < COLS; c++)
    d3.select(`#hover-col-${c}`).attr('opacity', 0);
}

// ============================================================
// Web Worker
// ============================================================
function initWorker() {
  if (typeof Worker === 'undefined') return;
  try {
    worker = new Worker('worker.js');
    worker.onmessage = e => doAiPlay(e.data.col);
    worker.onerror   = err => {
      console.warn('Worker error:', err);
      worker = null;
    };
  } catch (e) {
    console.warn('Worker init failed:', e);
  }
}

// ============================================================
// Controls
// ============================================================
function bindControls() {
  // Difficulty buttons
  document.querySelectorAll('[data-level]').forEach(btn => {
    btn.addEventListener('click', () => {
      soundEngine.playClick();
      document.querySelectorAll('[data-level]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.level;
    });
  });

  // Play-as buttons
  document.getElementById('btn-first').addEventListener('click', () => {
    soundEngine.playClick();
    setHumanAs(1);
    document.getElementById('btn-first').classList.add('active');
    document.getElementById('btn-second').classList.remove('active');
    startNewGame();
  });
  document.getElementById('btn-second').addEventListener('click', () => {
    soundEngine.playClick();
    setHumanAs(2);
    document.getElementById('btn-second').classList.add('active');
    document.getElementById('btn-first').classList.remove('active');
    startNewGame();
  });

  // New game
  document.getElementById('btn-new-game').addEventListener('click', () => {
    soundEngine.playClick();
    startNewGame();
  });

  // Sound toggle
  document.getElementById('btn-sound').addEventListener('click', () => {
    const on = soundEngine.toggle();
    document.getElementById('btn-sound').textContent = on ? '🔊' : '🔇';
    document.getElementById('btn-sound').title = on ? 'Sound On' : 'Sound Off';
  });

  // Music toggle (independent of SFX)
  document.getElementById('btn-music').addEventListener('click', () => {
    const on = musicEngine.toggle();
    const btn = document.getElementById('btn-music');
    btn.title = on ? 'Music On' : 'Music Off';
    btn.classList.toggle('active', on);
  });
}

function setHumanAs(n) {
  humanNum  = n;
  aiNum     = n === 1 ? 2 : 1;
  curPlayer = 1;
}

// ============================================================
// UI helpers
// ============================================================
function setStatus(msg) {
  const el = document.getElementById('status-msg');
  if (el) el.textContent = msg;
}

// Toggle the AI-thinking visual state:
//   • pulses the status bar cyan (Synthwave) or Vista blue (Aero)
//   • runs a scanning beam across the board
function setThinking(on) {
  const statusEl = document.getElementById('status-msg');
  const boardEl  = document.querySelector('.board-shell');
  if (on) {
    if (statusEl) {
      statusEl.textContent = '\u{1F916} AI is thinking\u2026';
      statusEl.classList.add('ai-thinking');
    }
    if (boardEl) boardEl.classList.add('ai-thinking');
  } else {
    if (statusEl) statusEl.classList.remove('ai-thinking');
    if (boardEl)  boardEl.classList.remove('ai-thinking');
  }
}

function updateScores() {
  document.getElementById('score-human').textContent = scores.human;
  document.getElementById('score-ai').textContent    = scores.ai;
  document.getElementById('score-draws').textContent = scores.draws;
}

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', init);
