# Ports
GATEWAY_PORT=3000
AUTH_PORT=4000

# Default target
.PHONY: start
start: start-auth start-gateway
	@echo "All services started successfully!"

# Start Auth service
.PHONY: start-auth
start-auth:
	@echo "Starting Auth Service on port $(AUTH_PORT)..."
	@cd backend/services/auth && node auth.js &
	@sleep 2

# Start Gateway
.PHONY: start-gateway
start-gateway:
	@echo "Starting Gateway on port $(GATEWAY_PORT)..."  
	@cd backend/gateway && node gateway.js &
	@sleep 2

# Stop all Node services
.PHONY: stop
stop:
	@echo "Stopping all Node services..."
	@-lsof -ti:$(AUTH_PORT) | xargs -r kill
	@-lsof -ti:$(GATEWAY_PORT) | xargs -r kill
	@sleep 1
	@echo "All services stopped"

# Check status of services
.PHONY: status
status:
	@echo "Checking service status..."
	@echo "Auth Service (port $(AUTH_PORT)):"
	@lsof -ti:$(AUTH_PORT) && echo "  ✅ Running" || echo "  ❌ Not running"
	@echo "Gateway (port $(GATEWAY_PORT)):"
	@lsof -ti:$(GATEWAY_PORT) && echo "  ✅ Running" || echo "  ❌ Not running"

# Restart all services
.PHONY: restart
restart: stop
	@sleep 2
	@$(MAKE) start

# Install dependencies for all services
.PHONY: install
install:
	@echo "Installing dependencies..."
	@cd backend/services/auth && npm install
	@cd backend/gateway && npm install
	@echo "Dependencies installed!"

# Show logs (requires services to be running)
.PHONY: logs
logs:
	@echo "Use Ctrl+C to stop viewing logs"
	@echo "=== Auth Service Logs ==="
	@tail -f backend/services/auth/auth.log 2>/dev/null || echo "No auth logs found"
	@echo "=== Gateway Logs ==="  
	@tail -f backend/gateway/gateway.log 2>/dev/null || echo "No gateway logs found"

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make start    - Start all services"
	@echo "  make stop     - Stop all services" 
	@echo "  make restart  - Restart all services"
	@echo "  make status   - Check service status"
	@echo "  make install  - Install dependencies"
	@echo "  make help     - Show this help"
