PM := npm

# Commands (you can override these when invoking make)
INSTALL := $(PM) install
DEV := $(PM) run dev
BUILD := $(PM) run build
PREVIEW := $(PM) run preview
LINT := $(PM) run lint
FORMAT := $(PM) run format
TEST := $(PM) run test

# Tailwind CLI (uses npx so it works without global install)
TAILWIND := npx tailwindcss
TAILWIND_IN ?= src/index.css
TAILWIND_OUT_DEV ?= src/tailwind.css
TAILWIND_OUT_PROD ?= dist/assets/tailwind.css

# TypeScript check
TSC := npx tsc --noEmit

.PHONY: help install dev build preview lint format typecheck tailwind-watch tailwind-build clean

help:
	@printf "Usage:\n"
	@printf "  make install        Install dependencies (%s)\n" "$(PM)"
	@printf "  make dev            Start Vite dev server\n"
	@printf "  make build          Build for production (vite)\n"
	@printf "  make preview        Preview production build\n"
	@printf "  make typecheck      Run TypeScript type check (tsc --noEmit)\n"
	@printf "  make tailwind-watch Run Tailwind in watch mode (writes to $(TAILWIND_OUT_DEV))\n"
	@printf "  make tailwind-build Build Tailwind CSS for production (writes to $(TAILWIND_OUT_PROD))\n"
	@printf "  make lint           Run lint script (if configured)\n"
	@printf "  make format         Run format script (if configured)\n"
	@printf "  make clean          Remove node_modules, dist and generated css\n"

install:
	@echo "=> Installing dependencies using $(PM)"
	@$(INSTALL)

dev:
	@echo "=> Building Tailwind CSS for production:"
	@echo "   input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT_DEV)"
	@mkdir -p $(dir $(TAILWIND_OUT_DEV))
	@$(TAILWIND) -i $(TAILWIND_IN) -o $(TAILWIND_OUT_DEV) --minify
	@echo "=> Starting Vite dev server"
	@$(DEV)

build:
	@echo "=> Building production bundle"
	@$(BUILD)

preview:
	@echo "=> Previewing production build"
	@$(PREVIEW)

typecheck:
	@echo "=> Running TypeScript type check"
	@$(TSC)

tailwind-watch:
	@echo "=> Running Tailwind in watch mode:"
	@echo "   input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT_DEV)"
	@$(TAILWIND) -i $(TAILWIND_IN) -o $(TAILWIND_OUT_DEV) --watch

tailwind-build:
	@echo "=> Building Tailwind CSS for production:"
	@echo "   input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT_PROD)"
	@mkdir -p $(dir $(TAILWIND_OUT_PROD))
	@$(TAILWIND) -i $(TAILWIND_IN) -o $(TAILWIND_OUT_PROD) --minify

lint:
	@echo "=> Running lint"
	@$(LINT)

format:
	@echo "=> Running format"
	@$(FORMAT)

test:
	@echo "=> Running tests"
	@$(TEST)

clean:
	@echo "=> Cleaning node_modules, dist, and generated css"
	@rm -rf node_modules dist $(TAILWIND_OUT_DEV)