SHELL := /bin/bash

# Frontend Makefile (TypeScript + Tailwind)
SRC_DIR := src
CSS_IN := $(SRC_DIR)/styles.css
CSS_OUT := $(SRC_DIR)/output.css
PORT := 3004

.PHONY: install build build-ts watch-ts watch-css dev serve clean help down

install:
	@echo "Installing npm dependencies..."
	npm install

build: build-ts
	@echo "Frontend build complete."

build-ts:
	@echo "Compiling TypeScript..."
	npx tsc ./src/index.ts --lib es6,dom --outDir src/dist --sourceMap

down:
	@echo "Stopping all frontend processes..."
	@pkill -f "npx tsc" || true
	@pkill -f "npx tailwindcss" || true
	@pkill -f "python3 -m http.server" || true

watch-ts:
	@echo "Starting TypeScript watcher..."
	npx tsc ./src/index.ts --lib es6,dom --outDir src/dist --watch --sourceMap

watch-css:
	@echo "Starting Tailwind watcher..."
	npx tailwindcss -i $(CSS_IN) -o $(CSS_OUT) --watch

dev:
	@echo "Starting dev environment (TS watch, Tailwind watch, static server)..."
	@trap 'echo "Stopping dev processes..."; kill $$TS_PID $$CSS_PID $$SERV_PID 2>/dev/null || true; exit 0' INT TERM
	# start TS watcher
	@npx tsc ./src/index.ts --lib es6,dom --outDir dist --sourceMap
	# start Tailwind watcher
	# start simple static server (python3)
	@python3 -m http.server $(PORT) --directory $(SRC_DIR) & \
	SERV_PID=$$!; \
	echo "Dev server running on http://localhost:$(PORT)"; \
	echo "PIDs: $$SERV_PID"; \
	wait

serve:
	@echo "Serving $(SRC_DIR) on http://localhost:$(PORT)"
	python3 -m http.server $(PORT) --directory $(SRC_DIR)

clean:
	@echo "Cleaning generated files..."
	@rm -f $(CSS_OUT)
	@rm -rf dist

help:
	@echo "Frontend Makefile targets:"
	@echo "  make install      - install npm deps"
	@echo "  make build        - compile TS and build Tailwind CSS"
	@echo "  make build-ts     - compile TypeScript"
	@echo "  make build-css    - build Tailwind CSS (minified)"
	@echo "  make watch-ts     - run tsc --watch"
	@echo "  make watch-css    - run tailwindcss --watch"
	@echo "  make dev          - run TS watcher, Tailwind watcher and static server (foreground)"
	@echo "  make serve        - serve ./src via python3 http.server"
	@echo "  make clean        - remove generated files"