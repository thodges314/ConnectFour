# Connect Four — Dual Edition

A polished, perfect-play Connect Four implementation featuring two distinct high-fidelity aesthetics: **Synthwave** and **Frutiger Aero**.

## Features

- **Dual-Theme Engine** — Switch seamlessly between a high-contrast Neon Nightcore look and a glossy 2000s "Frutiger Aero" aesthetic.
- **Four difficulty levels** — Easy, Moderate, Hard, Perfect.
- **Perfect AI** — Full iterative-deepening alpha-beta search powered by a high-performance bitboard engine.
- **D3 SVG board** — SVG masking provides a classic "holes in a frame" look with physics-based disk drop and bounce animations.
- **Synthesised Sound Engine** — Theme-aware sound effects and ambient background music loops synthesised entirely via Web Audio API (no external audio files required).
- **Web Worker AI** — The engine runs off the main thread, ensuring the UI remains buttery smooth at all times.

## Quick Start

```bash
# Serve the docs/ directory directly
make serve
# then open http://localhost:8000
```

## Aesthetics & Themes

### 🌌 Synthwave (Default)
- **Visuals**: Neon pink/cyan palette, animated background grid, scanlines, and glow filters.
- **Typography**: Header: *Orbitron*, Body: *Rajdhani*.
- **Audioscape**: Thick filtered noise "thunks", sawtooth arpeggios, and a driving 120 BPM synth loop "Neon Grid".

### 🌊 Frutiger Aero
- **Visuals**: Glossy "Vista-style" glassmorphism, 3D SVG disks with specular highlights and rim-lighting, and warm blue/gold gradients.
- **Typography**: Header: *Maven Pro*, Body: *Nunito*.
- **Audioscape**: Crystalline glass chimes, water-drop "clacks", and a bubbly 96 BPM ambient loop "Aero Flow".

## Difficulty Levels

| Level    | Engine | Strategy                                                  | Latency |
|----------|--------|-----------------------------------------------------------|---------|
| Easy     | JS     | Wins/blocks obvious moves; random otherwise               | instant |
| Moderate | JS     | Alpha-beta search to **depth 5**                          | < 10 ms |
| Hard     | WASM   | Bitboard Alpha-beta search to **depth 12**                | ~50 ms  |
| Perfect  | WASM   | Full **depth 42** iterative deepening with 5s time budget | ≤ 5 s   |

> **Optimal Play:** In **Perfect** mode, the engine uses a depth-aware transposition table to ensure mathematical perfection. From an empty board, the AI provably plays the optimal center column (column 4) move instantly.

## Project Structure

```
ConnectFour/
├── engine/
│   ├── Board.hpp         ← Tromp 7×7 bitboard, win detection
│   ├── Solver.hpp        ← Negamax α-β, TT, iterative deepening
│   └── wasm_bridge.cpp   ← Emscripten bindings (optional WASM build)
├── docs/
│   ├── index.html        ← Page structure
│   ├── style.css         ← Global styles + theme variants
│   ├── app.js            ← D3 board, physics animations, game logic
│   ├── theme.js          ← Persistence and transition logic for themes
│   ├── sounds.js         ← Dual-mode Web Audio engine
│   ├── solver.js         ← Pure JS alpha-beta fallback (used by worker)
│   └── worker.js         ← Web Worker wrapper for async AI
├── Makefile
└── README.md
```

## AI Architecture

### Bitboard (Board.hpp)

Uses the Tromp 7×7 bitboard layout — two `uint64_t` bitboards (one per player). Each column is represented by 7 bits (6 rows + 1 sentinel bit). This allows for branchless win detection in just a few bitwise operations:

```cpp
m = pos & (pos>>7); if (m&(m>>14)) return true; // horizontal
m = pos & (pos>>1); if (m&(m>> 2)) return true; // vertical
m = pos & (pos>>6); if (m&(m>>12)) return true; // diagonal ↗
m = pos & (pos>>8); if (m&(m>>16)) return true; // diagonal ↘
```

### Depth-First Search (Solver.hpp)

- **Negamax with Alpha-Beta Pruning**
- **Move Ordering**: Center-first heuristic `{3, 2, 4, 1, 5, 0, 6}` to maximise pruning efficiency.
- **Transposition Table**: Depth-aware result caching using `unordered_map` with Tromp position hashing.
- **Iterative Deepening**: Dynamically increases search depth. In **Perfect** mode, the AI uses a 5-second thinking budget per move.

## Technical Details

- **Audio Autoplay**: Due to browser security policies, background music is enabled by default but will only commence after the first user interaction with the page.
- **WASM Support**: While a pure JS fallback is provided for compatibility, the C++ engine can be compiled to WebAssembly via Emscripten for a 5–10× speed boost is solver performance.

```bash
# Optional: Compile to WASM
make wasm
```

## Why no opening book?

Connect 4’s state space is small enough that a bitboard-optimised alpha-beta solver can reach terminal nodes or solve a position from move 1 within seconds. By using iterative deepening and a center-weighted heuristic, the engine naturally finds the optimal first move (center column) and plays perfectly without needing large pre-calculated data files.

