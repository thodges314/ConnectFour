# ============================================================
# Connect Four — Makefile
# Targets:
#   make serve      — start local HTTP server (no build needed)
#   make wasm       — compile engine to WASM via Emscripten
#   make test       — build and run native C++ unit tests
#   make clean      — remove build artifacts
# ============================================================

CXX       := clang++
CXXFLAGS  := -std=c++17 -O2 -Wall -Wextra -DNDEBUG
EM        := em++
EMFLAGS   := -std=c++17 -O3 -DNDEBUG \
             -s EXPORTED_FUNCTIONS='["_reset","_canPlay","_play","_getBestMove","_getCell","_getMoveCount"]' \
             -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall"]' \
             -s ALLOW_MEMORY_GROWTH=1 \
             -s MODULARIZE=1 \
             -s EXPORT_NAME='createEngineModule'

SRC_DIR   := engine
PUB_DIR   := docs
BUILD_DIR := build

# ----- serve (no build required) ---------------------------
.PHONY: serve
serve:
	@echo "→ Serving at http://localhost:8000 (Ctrl-C to stop)"
	python3 -m http.server 8000 --directory $(PUB_DIR)

# ----- WASM build ------------------------------------------
.PHONY: wasm
wasm: $(PUB_DIR)/engine.js

$(PUB_DIR)/engine.js: $(SRC_DIR)/wasm_bridge.cpp $(SRC_DIR)/Board.hpp $(SRC_DIR)/Solver.hpp
	@mkdir -p $(PUB_DIR)
	$(EM) $(EMFLAGS) $< -o $@
	@echo "→ WASM built: $(PUB_DIR)/engine.js + engine.wasm"

# ----- Native unit test ------------------------------------
.PHONY: test
test: $(BUILD_DIR)/test_engine
	./$(BUILD_DIR)/test_engine

$(BUILD_DIR)/test_engine: $(SRC_DIR)/test_engine.cpp $(SRC_DIR)/Board.hpp $(SRC_DIR)/Solver.hpp
	@mkdir -p $(BUILD_DIR)
	$(CXX) $(CXXFLAGS) $< -o $@

# ----- clean -----------------------------------------------
.PHONY: clean
clean:
	rm -rf $(BUILD_DIR) $(PUB_DIR)/engine.js $(PUB_DIR)/engine.wasm
