#pragma once
// ============================================================
// Connect Four — Board  (Tromp 7×7 bitboard layout)
// Based on Pascal Pons' approach: http://blog.gamesolver.org/
//
// Bit layout for column c, row r:  bit index = c*7 + r
//   row 0 = bottom (gravity)
//   row 5 = top
//   row 6 = sentinel (always 0, prevents wrap in win detection)
//
//   col:  0  1  2  3  4  5  6
//         6 13 20 27 34 41 48   ← sentinel
//         5 12 19 26 33 40 47
//         4 11 18 25 32 39 46
//         3 10 17 24 31 38 45
//         2  9 16 23 30 37 44
//         1  8 15 22 29 36 43
//         0  7 14 21 28 35 42   ← bottom (row 0)
// ============================================================

#include <cstdint>
#include <array>
#include <cassert>
#include <cstring>

class Board {
public:
    static constexpr int WIDTH  = 7;
    static constexpr int HEIGHT = 6;
    static constexpr int MIN_SCORE = -(WIDTH * HEIGHT) / 2 + 3;
    static constexpr int MAX_SCORE =  (WIDTH * HEIGHT + 1) / 2 - 3;

    // ---- per-player piece mask + full mask ----
    uint64_t current;   // current player's pieces
    uint64_t mask;      // all occupied cells
    int      heights[WIDTH];
    int      num_moves;

    Board() { reset(); }

    void reset() {
        current = 0;
        mask    = 0;
        num_moves = 0;
        std::fill(heights, heights + WIDTH, 0);
    }

    Board(const Board&) = default;
    Board& operator=(const Board&) = default;

    // -------------------------------------------
    bool canPlay(int col) const {
        return heights[col] < HEIGHT;
    }

    // Returns true if playing col wins for current player
    bool isWinningMove(int col) const {
        uint64_t pos = current | (mask + bottomMask(col)) & columnMask(col);
        return alignment(pos);
    }

    // Play a move — automatically switches who "current" refers to
    void play(int col) {
        current ^= mask;                        // flip to opponent's view
        mask    |= mask + bottomMask(col);      // add the new piece to mask
        heights[col]++;
        num_moves++;
    }

    // Unique position key (encodes full board state including whose turn)
    uint64_t key() const {
        return current + mask + bottomRowMask();
    }

    bool isFull() const { return num_moves == WIDTH * HEIGHT; }

    // For display: which player owns (col, row)?  1 = P1, 2 = P2, 0 = empty
    // We track P1's pieces separately via p1_mask (set by external code or replay)
    // For a simple check: piece at (col,row) is in mask; whose it is depends on
    // parity — but this requires replaying from start.  The JS layer handles display.

    // -------------------------------------------
    // Static utilities
    // -------------------------------------------

    static bool alignment(uint64_t pos) {
        uint64_t m;
        m = pos & (pos >> 7); if (m & (m >> 14)) return true; // horizontal
        m = pos & (pos >> 1); if (m & (m >> 2))  return true; // vertical
        m = pos & (pos >> 6); if (m & (m >> 12)) return true; // diagonal ↗
        m = pos & (pos >> 8); if (m & (m >> 16)) return true; // diagonal ↘
        return false;
    }

    static uint64_t bottomMask(int col) {
        return UINT64_C(1) << (col * 7);
    }

    static uint64_t columnMask(int col) {
        return ((UINT64_C(1) << HEIGHT) - 1) << (col * 7);
    }

    static uint64_t bottomRowMask() {
        uint64_t m = 0;
        for (int c = 0; c < WIDTH; c++) m |= bottomMask(c);
        return m;
    }

    static uint64_t boardMask() {
        uint64_t m = 0;
        for (int c = 0; c < WIDTH; c++) m |= columnMask(c);
        return m;
    }
};
