// ============================================================
// Connect Four — Emscripten WASM Bridge
// Build: em++ -O3 wasm_bridge.cpp -o ../public/engine.js
//        -s EXPORTED_FUNCTIONS="['_reset','_canPlay','_play','_getBestMove','_getCell']"
//        -s EXPORTED_RUNTIME_METHODS="['cwrap']" -s ALLOW_MEMORY_GROWTH=1
// ============================================================

#include "Board.hpp"
#include "Solver.hpp"
#include <emscripten/emscripten.h>
#include <cstdlib>
#include <ctime>

static Board   g_board;
static Solver  g_solver;
// Track display state: p1_grid[row*7+col] = 1 if P1 piece, 0 otherwise
static int8_t  g_p1[Board::HEIGHT * Board::WIDTH] = {};
static int8_t  g_p2[Board::HEIGHT * Board::WIDTH] = {};
static int     g_cur_player = 1; // 1 or 2

extern "C" {

EMSCRIPTEN_KEEPALIVE
void reset() {
    g_board.reset();
    g_solver.resetTT();
    g_cur_player = 1;
    for (int i = 0; i < Board::HEIGHT * Board::WIDTH; i++) g_p1[i] = g_p2[i] = 0;
    std::srand(std::time(nullptr));
}

EMSCRIPTEN_KEEPALIVE
int canPlay(int col) { return g_board.canPlay(col) ? 1 : 0; }

// Returns: 1 = win, 0 = draw, -1 = continue, -2 = illegal
EMSCRIPTEN_KEEPALIVE
int play(int col) {
    if (!g_board.canPlay(col)) return -2;
    int row = g_board.heights[col];
    if (g_cur_player == 1) g_p1[row * Board::WIDTH + col] = 1;
    else                   g_p2[row * Board::WIDTH + col] = 1;
    g_board.play(col);
    g_cur_player = g_cur_player == 1 ? 2 : 1;
    if (g_board.isFull()) return 0;
    return -1;
}

// Returns best column for current player
// difficulty: 0=easy, 1=moderate, 2=hard, 3=perfect
EMSCRIPTEN_KEEPALIVE
int getBestMove(int difficulty) {
    if (difficulty == 0) {
        // Random with slight preference for center
        int legal[Board::WIDTH], n = 0;
        for (int col : Solver::MOVE_ORDER)
            if (g_board.canPlay(col)) legal[n++] = col;
        return legal[std::rand() % n];
    }
    return g_solver.getBestMove(g_board, difficulty);
}

// Returns cell owner: 0=empty, 1=P1, 2=P2
EMSCRIPTEN_KEEPALIVE
int getCell(int col, int row) {
    if (g_p1[row * Board::WIDTH + col]) return 1;
    if (g_p2[row * Board::WIDTH + col]) return 2;
    return 0;
}

EMSCRIPTEN_KEEPALIVE
int getMoveCount() { return g_board.num_moves; }

} // extern "C"
