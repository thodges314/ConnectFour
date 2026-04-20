#pragma once
// ============================================================
// Connect Four — Solver (negamax alpha-beta + transposition table)
// ============================================================

#include "Board.hpp"
#include <unordered_map>
#include <array>
#include <algorithm>
#include <chrono>
#include <atomic>

class Solver {
public:
    // Center-first column exploration order
    static constexpr int MOVE_ORDER[Board::WIDTH] = {3, 2, 4, 1, 5, 0, 6};

    std::unordered_map<uint64_t, int8_t> tt;    // transposition table
    std::atomic<bool> abort{false};
    long long node_count = 0;
    std::chrono::steady_clock::time_point deadline;
    bool use_deadline = false;

    void resetTT() { tt.clear(); }

    // -------------------------------------------------------
    // negamax — returns score from current player's perspective
    //   score > 0  →  current player wins  (in N moves: score = (cells_left+1)/2)
    //   score = 0  →  draw
    //   score < 0  →  current player loses
    // -------------------------------------------------------
    int negamax(Board& board, int alpha, int beta) {
        if (abort.load(std::memory_order_relaxed)) return 0;
        if ((++node_count & 0x3FFF) == 0 && use_deadline) {
            if (std::chrono::steady_clock::now() > deadline) {
                abort.store(true);
                return 0;
            }
        }

        if (board.isFull()) return 0;

        // Can current player win immediately?
        for (int col : MOVE_ORDER) {
            if (board.canPlay(col) && board.isWinningMove(col)) {
                return (Board::WIDTH * Board::HEIGHT + 1 - board.num_moves) / 2;
            }
        }

        // Upper-bound pruning
        int max_score = (Board::WIDTH * Board::HEIGHT - 1 - board.num_moves) / 2;
        if (beta > max_score) {
            beta = max_score;
            if (alpha >= beta) return beta;
        }

        // Transposition table lookup
        uint64_t key = board.key();
        auto it = tt.find(key);
        if (it != tt.end()) {
            int val = it->second;
            if (val > 0) {
                // lower bound
                if (alpha < val - Board::WIDTH * Board::HEIGHT / 2 - 1)
                    alpha = val - Board::WIDTH * Board::HEIGHT / 2 - 1;
            } else {
                if (beta > val + Board::WIDTH * Board::HEIGHT / 2 + 1)
                    beta  = val + Board::WIDTH * Board::HEIGHT / 2 + 1;
            }
            if (alpha >= beta) return val;
        }

        for (int col : MOVE_ORDER) {
            if (!board.canPlay(col)) continue;
            Board next = board;
            next.play(col);
            int score = -negamax(next, -beta, -alpha);
            if (abort.load(std::memory_order_relaxed)) return 0;
            if (score >= beta) return score;
            if (score > alpha) alpha = score;
        }

        tt[key] = static_cast<int8_t>(alpha);
        return alpha;
    }

    // -------------------------------------------------------
    // getBestMove — returns best column (0-indexed)
    //   difficulty: 0=easy, 1=moderate, 2=hard, 3=perfect
    //   time_ms: wall-clock budget for iterative deepening
    // -------------------------------------------------------
    int getBestMove(Board& board, int difficulty, int time_ms = 5000) {
        const int opponent = 1; // placeholder
        abort.store(false);
        node_count = 0;

        // Easy: random (handled in WASM bridge)
        if (difficulty == 0) return -1;

        // Win immediately?
        for (int col : MOVE_ORDER) {
            if (board.canPlay(col) && board.isWinningMove(col))
                return col;
        }

        // Block opponent winning move
        // Build a Board from opponent's perspective
        Board opp_board = board;
        opp_board.current ^= opp_board.mask; // flip current player
        for (int col : MOVE_ORDER) {
            if (opp_board.canPlay(col) && opp_board.isWinningMove(col))
                return col;
        }

        int max_depth = (difficulty == 1) ? 5 :
                        (difficulty == 2) ? 12 : 42;

        if (difficulty == 3) {
            deadline = std::chrono::steady_clock::now() +
                       std::chrono::milliseconds(time_ms);
            use_deadline = true;
        } else {
            use_deadline = false;
        }

        int best_col = MOVE_ORDER[0];
        for (int c : MOVE_ORDER) if (board.canPlay(c)) { best_col = c; break; }

        resetTT();

        // Iterative deepening
        for (int depth = 1; depth <= max_depth; depth++) {
            int iter_best = best_col;
            int iter_score = Board::MIN_SCORE - 1;

            for (int col : MOVE_ORDER) {
                if (!board.canPlay(col)) continue;
                Board next = board;
                next.play(col);
                int score = -negamax(next, Board::MIN_SCORE, Board::MAX_SCORE);
                if (abort.load(std::memory_order_relaxed)) goto done;
                if (score > iter_score) { iter_score = score; iter_best = col; }
            }

            best_col = iter_best;
            if (iter_score >= Board::MAX_SCORE) break; // sure win found
        }

        done:
        return best_col;
    }
};

// Required out-of-class definition for static array
constexpr int Solver::MOVE_ORDER[Board::WIDTH];
