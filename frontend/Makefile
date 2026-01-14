PM := npm

# Commands (you can override these when invoking make)
INSTALL := $(PM) install
DEV := $(PM) run dev --watch -- --host
BUILD := $(PM) run build
PREVIEW := $(PM) run preview
FORMAT := $(PM) run format
TEST := $(PM) run test

# Tailwind CLI (uses npx so it works without global install)
TAILWIND := npx tailwindcss
TAILWIND_IN ?= ./index.css
TAILWIND_OUT ?= ./tailwind.css

# TypeScript check
TSC := npx tsc --noEmit

.PHONY: help install dev build preview lint format typecheck tailwind-watch tailwind-build clean gen-certs test

help:
	@printf "Usage:\n"
	@printf "  make install        Install dependencies (%s)\n" "$(PM)"
	@printf "  make dev            Start Vite dev server\n"
	@printf "  make build          Build for production (vite)\n"
	@printf "  make preview        Preview production build\n"
	@printf "  make typecheck      Run TypeScript type check (tsc --noEmit)\n"
	@printf "  make tailwind-watch Run Tailwind in watch mode (writes to $(TAILWIND_OUT))\n"
	@printf "  make tailwind-build Build Tailwind CSS for production (writes to $(TAILWIND_OUT))\n"
	@printf "  make format         Run format script (if configured)\n"
	@printf "  make clean          Remove node_modules, dist and generated css\n"

install:
	@echo "=> Installing dependencies using $(PM)"
	@$(INSTALL)

dev: tailwind-build gen-certs
	@echo "=> Starting Tailwind in watch mode and Vite dev server"
	@echo "   tailwind: input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT)"
	@mkdir -p $(dir $(TAILWIND_OUT))
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
	@echo "   input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT)"
	@$(TAILWIND) -i $(TAILWIND_IN) -o $(TAILWIND_OUT)

tailwind-build:
	@echo "=> Building Tailwind CSS for production:"
	@echo "   input: $(TAILWIND_IN) -> output: $(TAILWIND_OUT)"
	@mkdir -p $(dir $(TAILWIND_OUT))
	@$(TAILWIND) -i $(TAILWIND_IN) -o $(TAILWIND_OUT) --minify

format:
	@echo "=> Running format"
	@$(FORMAT)

test:
	@echo "=> Running tests"
	@$(TEST)

clean:
	@echo "=> Cleaning node_modules, dist, and generated css"
	@rm -rf node_modules dist $(TAILWIND_OUT)

gen-certs:
	@if [ ! -f ./certs/certs/cert.pem ] || [ ! -f ./certs/certs/key.pem ]; then\
		echo "Generating self-signed SSL certificates...";\
		cd ./certs/ && bash ./generate-certs.sh;\
	fi