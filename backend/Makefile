# Ports
GATEWAY_PORT=3000
AUTH_PORT=3001
USERS_PORT=3002
NOTIFICATION_PORT=3003
CHAT_PORT=3004
PONG_PORT=3005
TRIS_PORT=3006

NODE = node --no-deprecation
NODE_OPTIONS_ENV = NODE_OPTIONS="--no-deprecation"

# Default target (production mode)
.PHONY: start
start: start-auth start-users start-notification start-chat start-pong start-tris start-gateway
	@echo "All services started successfully!"

# Development mode with auto-restart by nodemon
.PHONY: dev
dev: dev-auth dev-users dev-notification dev-chat dev-pong dev-tris dev-gateway
	@echo "All services started in development mode with auto-restart!"

redev: stop dev

.PHONY: frontend
frontend:
	@echo "Starting Frontend dev server on port 443..."
	@cd ../frontend && sudo $$(which node) ./node_modules/.bin/vite

# Start Auth service (production)
.PHONY: start-auth
start-auth:
	@echo "Starting Auth Service on port $(AUTH_PORT)..."
	@cd services/auth && $(NODE) src/auth.js &
	@sleep 1

# Start Auth service (development with auto-restart)
.PHONY: dev-auth
dev-auth:
	@echo "Starting Auth Service in dev mode on port $(AUTH_PORT)..."
	@cd services/auth && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

# Start Users service (production)
.PHONY: start-users
start-users:
	@echo "Starting Users Service on port $(USERS_PORT)..."
	@cd services/users && $(NODE) src/users.js &
	@sleep 1

# Start Users service (development with auto-restart)
.PHONY: dev-users
dev-users:
	@echo "Starting Users Service in dev mode on port $(USERS_PORT)..."
	@cd services/users && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

.PHONY: dev-notification
dev-notification:
	@echo "Starting Notification Service in dev mode..."
	@cd services/notification && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

.PHONY: start-notification
start-notification:
	@echo "Starting Notification Service..."
	@cd services/notification && $(NODE) src/notification.js &
	@sleep 1

.PHONY: dev-chat
dev-chat:
	@echo "Starting Chat Service in dev mode..."
	@cd services/chat && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

.PHONY: start-chat
start-chat:
	@echo "Starting Chat Service..."
	@cd services/chat && $(NODE) src/chat.js &
	@sleep 1

.PHONY: start-pong
start-pong:
	@echo "Starting Pong Service on port $(PONG_PORT)..."
	@cd services/pong && $(NODE) src/pong.js &
	@sleep 1

.PHONY: dev-pong
dev-pong:
	@echo "Starting Pong Service in dev mode on port $(PONG_PORT)..."
	@cd services/pong && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

.PHONY: dev-tris
dev-tris:
	@echo "Starting Tris Service in dev mode on port $(TRIS_PORT)..."
	@cd services/tris && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

.PHONY: start-tris
start-tris:
	@echo "Starting Tris Service on port $(TRIS_PORT)..."
	@cd services/tris && $(NODE) src/tris.js &
	@sleep 1

# Start Gateway (production)
.PHONY: start-gateway
start-gateway:
	@echo "Starting Gateway on port $(GATEWAY_PORT)..."  
	@cd gateway && $(NODE) gateway.js &
	@sleep 1

# Start Gateway (development with auto-restart)
.PHONY: dev-gateway
dev-gateway:
	@echo "Starting Gateway in dev mode on port $(GATEWAY_PORT)..."
	@cd gateway && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 1

# Stop all Node services
.PHONY: stop
stop:
	@echo "Stopping all Node services..."
	@-ss -tlnp | grep ":$(AUTH_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(USERS_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(NOTIFICATION_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(CHAT_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(PONG_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(TRIS_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(GATEWAY_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-pkill -f "auth\.js" 2>/dev/null || true
	@-pkill -f "users\.js" 2>/dev/null || true
	@-pkill -f "notification\.js" 2>/dev/null || true
	@-pkill -f "chat\.js" 2>/dev/null || true
	@-pkill -f "pong\.js" 2>/dev/null || true
	@-pkill -f "tris\.js" 2>/dev/null || true
	@-pkill -f "gateway\.js" 2>/dev/null || true
	@echo "All services stopped"

# Check status of services
.PHONY: status
status:
	@echo "Checking service status..."
	@echo "Auth Service (port $(AUTH_PORT)):"
	@ss -tlnp | grep -q ":$(AUTH_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Users Service (port $(USERS_PORT)):"
	@ss -tlnp | grep -q ":$(USERS_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Notification Service (port $(NOTIFICATION_PORT)):"
	@ss -tlnp | grep -q ":$(NOTIFICATION_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Chat Service (port $(CHAT_PORT)):"
	@ss -tlnp | grep -q ":$(CHAT_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Pong Service (port $(PONG_PORT)):"
	@ss -tlnp | grep -q ":$(PONG_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Tris Service (port $(TRIS_PORT)):"
	@ss -tlnp | grep -q ":$(TRIS_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

	@echo "Gateway (port $(GATEWAY_PORT)):"
	@ss -tlnp | grep -q ":$(GATEWAY_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

# Restart all services
.PHONY: restart
restart: stop
	@sleep 1
	@$(MAKE) start

# Install dependencies for all services
.PHONY: install
install: gen-certs
	@echo "Installing dependencies..."
	@cd services/auth && npm install
	@cd services/users && npm install
	@cd services/notification && npm install
	@cd services/chat && npm install
	@cd services/pong && npm install
	@cd services/tris && npm install
	@cd gateway && npm install
	@echo "Dependencies installed!"

# Show logs (requires services to be running)
.PHONY: logs
logs:
	@echo "Use Ctrl+C to stop viewing logs"
	@echo "=== Auth Service Logs ==="
	@tail -f services/auth/auth.log 2>/dev/null || echo "No auth logs found"
	@echo "=== Users Service Logs ==="  
	@tail -f services/users/users.log 2>/dev/null || echo "No users logs found"
	@echo "=== Notification Service Logs ==="  
	@tail -f services/notification/notification.log 2>/dev/null || echo "No notification logs found"
	@echo "=== Chat Service Logs ==="  
	@tail -f services/chat/chat.log 2>/dev/null || echo "No chat logs found"
	@echo "=== Pong Service Logs ==="  
	@tail -f services/pong/pong.log 2>/dev/null || echo "No pong logs found"
	@echo "=== Tris Service Logs ==="  
	@tail -f services/tris/tris.log 2>/dev/null || echo "No tris logs found"
	@echo "=== Gateway Logs ==="  
	@tail -f gateway/gateway.log 2>/dev/null || echo "No gateway logs found"

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  Production mode:"
	@echo "    make start    - Start all services"
	@echo "    make stop     - Stop all services" 
	@echo "    make restart  - Restart all services"
	@echo ""
	@echo "  Development mode (auto-restart on file changes):"
	@echo "    make dev         - Start all services in dev mode"
	@echo "    make redev       - Restart all services in dev mode"
	@echo "    make dev-auth    - Start only auth service in dev mode"
	@echo "    make dev-users   - Start only users service in dev mode"
	@echo "    make dev-notification - Start only notification service in dev mode"
	@echo "    make dev-pong    - Start only pong service in dev mode"
	@echo "    make dev-tris    - Start only tris service in dev mode"
	@echo "    make dev-chat    - Start only chat service in dev mode"
	@echo "    make dev-gateway - Start only gateway in dev mode"
	@echo ""
	@echo "  Utilities:"
	@echo "    make status   - Check service status"
	@echo "    make install  - Install dependencies"
	@echo "    make help     - Show this help"

.PHONY: remove-databases
remove-databases:
	@echo "Removing all database files (*.db)..."
	@find . -path "*/data/*.db" -type f -delete
	@echo "Database files removed."


# Clean build artifacts and temporary files
.PHONY: clean
clean:
	@echo "Cleaning temporary files and logs..."
	@find . -name "*.log" -type f -delete
	@find . -name "*.tmp" -type f -delete
	@find . -name "*.swp" -type f -delete
	@find . -name "*.swo" -type f -delete
	@echo "Clean complete!"

# Complete clean: remove all gitignored files (node_modules, databases, etc.)
.PHONY: fclean
fclean: stop clean
	@echo "⚠️  WARNING: This will remove:"
	@echo "  - All node_modules/"
	@echo "  - All database files (*.db)"
	@echo "  - All .env files"
	@echo "  - All build/dist directories"
	@read -p "Continue? [y/N] " confirm && [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ] || exit 1
	@echo "Removing node_modules..."
	@find . -name "node_modules" -type d -prune -exec rm -rf {} +
	@echo "Removing database files..."
	@find . -path "*/data/*.db" -type f -delete
	@echo "Removing .env files..."
	@find . -name ".env" -type f -delete
	@echo "Removing build directories..."
	@find . -name "dist" -type d -prune -exec rm -rf {} +
	@find . -name "build" -type d -prune -exec rm -rf {} +
	@echo "Removing SSL certificates..."
	@find . -path "*/certs/certs" -type d -prune -exec rm -rf {} +
	@echo "✅ Full clean complete! Run 'make install' to reinstall dependencies."

.PHONY: gen-certs
gen-certs:
	@echo "Generating self-signed SSL certificates..."
	@cd ./certs/ && bash ./generate-certs.sh 

# Rebuild from scratch
.PHONY: re
re: fclean install 