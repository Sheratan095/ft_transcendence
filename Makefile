run backend:
	cd backend && npm run devstart

check_port:
	lsof -i :3000 || echo "Port 3000 is free"