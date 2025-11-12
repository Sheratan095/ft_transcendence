# Ports
GATEWAY_PORT=3000
AUTH_PORT=3001
USERS_PORT=3002
NOTIFICATION_PORT=3003

NODE = node --trace-deprecation
NODE_OPTIONS_ENV = NODE_OPTIONS="--trace-deprecation"

# Default target (production mode)
.PHONY: start
start: start-auth start-users start-notification start-gateway
	@echo "All services started successfully!"

# Development mode with auto-restart by nodemon
.PHONY: dev
dev: dev-auth dev-users dev-notification dev-gateway
	@echo "All services started in development mode with auto-restart!"

redev: stop dev

# Start Auth service (production)
.PHONY: start-auth
start-auth:
	@echo "Starting Auth Service on port $(AUTH_PORT)..."
	@cd services/auth && $(NODE) src/auth.js &
	@sleep 2

# Start Auth service (development with auto-restart)
.PHONY: dev-auth
dev-auth:
	@echo "Starting Auth Service in dev mode on port $(AUTH_PORT)..."
	@cd services/auth && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 2

# Start Users service (production)
.PHONY: start-users
start-users:
	@echo "Starting Users Service on port $(USERS_PORT)..."
	@cd services/users && $(NODE) src/users.js &
	@sleep 2

# Start Users service (development with auto-restart)
.PHONY: dev-users
dev-users:
	@echo "Starting Users Service in dev mode on port $(USERS_PORT)..."
	@cd services/users && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 2

.PHONY: dev-notification
dev-notification:
	@echo "Starting Notification Service in dev mode..."
	@cd services/notification && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 2

.PHONY: start-notification
start-notification:
	@echo "Starting Notification Service..."
	@cd services/notification && $(NODE) src/notification.js &
	@sleep 2

# Start Gateway (production)
.PHONY: start-gateway
start-gateway:
	@echo "Starting Gateway on port $(GATEWAY_PORT)..."  
	@cd gateway && $(NODE) gateway.js &
	@sleep 2

# Start Gateway (development with auto-restart)
.PHONY: dev-gateway
dev-gateway:
	@echo "Starting Gateway in dev mode on port $(GATEWAY_PORT)..."
	@cd gateway && $(NODE_OPTIONS_ENV) npm run dev &
	@sleep 2

# Stop all Node services
.PHONY: stop
stop:
	@echo "Stopping all Node services..."
	@-ss -tlnp | grep ":$(AUTH_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(USERS_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(NOTIFICATION_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-ss -tlnp | grep ":$(GATEWAY_PORT)" | sed 's/.*pid=\([0-9]*\).*/\1/' | xargs -r kill 2>/dev/null || true
	@-pkill -f "nodemon.*auth\.js" 2>/dev/null || true
	@-pkill -f "nodemon.*users\.js" 2>/dev/null || true
	@-pkill -f "nodemon.*notification\.js" 2>/dev/null || true
	@-pkill -f "nodemon.*gateway\.js" 2>/dev/null || true
	@sleep 1
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

	@echo "Gateway (port $(GATEWAY_PORT)):"
	@ss -tlnp | grep -q ":$(GATEWAY_PORT)" && echo "  ✅ Running" || echo "  ❌ Not running"

# Restart all services
.PHONY: restart
restart: stop
	@sleep 2
	@$(MAKE) start

# Install dependencies for all services
.PHONY: install
install:
	@echo "Installing dependencies..."
	@cd services/auth && npm install
	@cd services/users && npm install
	@cd services/notification && npm install
	@cd gateway && npm install
	@echo "Dependencies installed!"

# Show logs (requires services to be running)
.PHONY: logs
logs:
	@echo "Use Ctrl+C to stop viewing logs"
	@echo "=== Auth Service Logs ==="
	@tail -f services/auth/auth.log 2>/dev/null || echo "No auth logs found"
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
	@echo "    make dev-gateway - Start only gateway in dev mode"
	@echo ""
	@echo "  Utilities:"
	@echo "    make status   - Check service status"
	@echo "    make install  - Install dependencies"
	@echo "    make help     - Show this help"
