# Connect Four — Synthwave Edition

A polished, perfect-play Connect Four implementation with a nightcore/synthwave UI.

## Features

- **Four difficulty levels** — Easy, Moderate, Hard, Perfect
- **Perfect AI** — full iterative-deepening alpha-beta search (no opening book needed)
- **D3 SVG board** — SVG masking gives the classic "holes in a frame" look
- **Physics drop animation** — multi-stage bounce (fall → b1 → b2 → b3 → settle)
- **Synthwave aesthetic** — neon pink/cyan palette, animated grid, scanlines, glassmorphism
- **Web Audio sound effects** — synthesised drop thud, arpeggio win/loss, hover tick
- **Web Worker AI** — engine runs off main thread; UI stays responsive at all times

## Quick Start

```bash
# No build step needed — serve public/ directly
make serve
# then open http://localhost:8000
```

## Difficulty Levels

| Level    | Strategy                                                  | Latency |
|----------|-----------------------------------------------------------|---------|
| Easy     | Wins/blocks obvious moves; 60 % chance to block; random otherwise | instant |
| Moderate | Alpha-beta to depth 6                                     | < 100 ms |
| Hard     | Alpha-beta to depth 12                                    | ~200 ms |
| Perfect  | Iterative deepening with 5-second budget (exact solve for most positions) | ≤ 5 s |

> **First move note:** When the board is empty, the provably optimal first move is the center column (column 4). The solver returns this instantly on all difficulty levels ≥ Moderate.

## Project Structure

```
ConnectFour/
├── engine/
│   ├── Board.hpp         ← Tromp 7×7 bitboard, win detection
│   ├── Solver.hpp        ← Negamax α-β, TT, iterative deepening
│   └── wasm_bridge.cpp   ← Emscripten bindings (optional WASM build)
├── public/
│   ├── index.html        ← Page structure
│   ├── style.css         ← Synthwave styling
│   ├── solver.js         ← Pure JS alpha-beta (used by Web Worker)
│   ├── worker.js         ← Web Worker wrapper
│   ├── sounds.js         ← Web Audio sound engine
│   └── app.js            ← D3 board, animations, game logic
├── Makefile
└── README.md
```

## Engine Architecture

### Bitboard (Board.hpp)

Uses the Tromp 7×7 layout — one `uint64_t` per player, with a sentinel row 6 that enables branchless 4-in-a-row detection in 8 bit operations:

```
m = pos & (pos>>7); if (m&(m>>14)) return true; // horizontal
m = pos & (pos>>1); if (m&(m>> 2)) return true; // vertical
m = pos & (pos>>6); if (m&(m>>12)) return true; // diagonal ↗
m = pos & (pos>>8); if (m&(m>>16)) return true; // diagonal ↘
```

### Solver (Solver.hpp)

- Negamax with alpha-beta pruning
- **Move ordering:** center-first `{3, 2, 4, 1, 5, 0, 6}` (critical for pruning efficiency)
- **Immediate win detection:** tries all columns for instant-win before recursing
- **Upper-bound optimisation:** tightens beta to `(cells_remaining)/2` before search
- **Transposition table:** `unordered_map<key, int8_t>` keyed on Tromp position hash
- **Iterative deepening** with optional wall-clock deadline (Perfect mode)

### JS Engine (solver.js)

Identical algorithm in JavaScript. Used immediately in the browser without any build step. Shared between the main thread (Easy/Moderate) and the Web Worker (Hard/Perfect).

## Optional WASM Build

For maximum performance, compile the C++ engine to WebAssembly:

```bash
# Source emsdk first
source ~/emsdk/emsdk_env.sh

make wasm
# Outputs: public/engine.js + public/engine.wasm
```

The JS fallback is fully functional without WASM — the WASM build provides a ~5–10× speed increase for Perfect mode.

## Why no opening book?

Connect 4's narrow branching factor (max 7 columns, effective ~2–3 with α-β pruning) makes it tractable in real time:

- Mid/late game: < 200 ms to exact solution
- Early game (move 1–6): iterative deepening reaches depth 10–14 within the 5 s budget
- The engine plays optimally for all practical purposes without pre-computation

This contrasts with the 5×5 Tic-Tac-Toe engine which requires a full opening book due to its exponentially larger state space (25! / symmetry vs 42!).
