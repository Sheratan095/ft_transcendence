import WebSocket from 'ws';

// Disable SSL certificate validation for self-signed certificates in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const USER_EMAIL = 'test2@gmail.com';
const USER_PASSWORD = '1234';
const GATEWAY_URL = 'https://localhost:3000';

let accessToken = '';
let refreshToken = '';
let userId = null;

async function login() {
	console.log('🔐 Logging in as User 2...');
	const response = await fetch(`${GATEWAY_URL}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ 
			email: USER_EMAIL, 
			password: USER_PASSWORD,
		})
	});

	if (!response.ok) {
		throw new Error(`Login failed: ${response.statusText}`);
	}

	const data = await response.json();
	userId = data.userId;

	// Extract cookies
	const cookies = response.headers.get('set-cookie');
	if (!cookies) {
		throw new Error('No cookies received from login');
	}

	// Parse cookies to extract tokens
	const cookieArray = cookies.split(',').map(c => c.trim());
	for (const cookie of cookieArray) {
		if (cookie.startsWith('accessToken=')) {
			accessToken = cookie.split(';')[0].split('=')[1];
		}
		if (cookie.startsWith('refreshToken=')) {
			refreshToken = cookie.split(';')[0].split('=')[1];
		}
	}

	console.log(`✅ Login successful - User ID: ${userId}`);
	console.log('🍪 Cookies obtained\n');
	
	return cookies;
}

function connectWebSocket(cookies) {
	return new Promise((resolve, reject) => {
		console.log('🔌 Connecting to Chat WebSocket...');
		const ws = new WebSocket('wss://localhost:3000/chat/ws', {
			headers: {
				'Cookie': cookies
			},
			rejectUnauthorized: false
		});

		ws.on('open', () => {
			console.log('✅ WebSocket connected successfully!\n');
			
			console.log('📝 Type your message and press Enter to send to room123');
			console.log('💡 Commands:');
			console.log('   - /join <roomId> - Join a room');
			console.log('   - /leave <roomId> - Leave a room');
			console.log('   - /pm <userId> <message> - Send private message');
			console.log('   - /quit - Disconnect\n');
			
			resolve(ws);
		});

		ws.on('message', (data) => {
			const rawMessage = data.toString();
			
			try {
				const message = JSON.parse(rawMessage);
				handleMessage(message);
			} catch (err) {
				console.log('📥 Raw message:', rawMessage);
			}
		});

		ws.on('close', () => {
			console.log('❌ WebSocket connection closed');
			process.exit(0);
		});

		ws.on('error', (err) => {
			console.error('❌ WebSocket error:', err.message);
			reject(err);
		});
	});
}

function handleMessage(message) {
	switch (message.event) {
		case 'chat.joined':
			console.log(`✅ Joined room: ${message.data.roomId}`);
			break;

		case 'chat.userJoined':
			console.log(`👤 User ${message.data.userId} joined room ${message.data.roomId}`);
			break;

		case 'chat.userLeft':
			console.log(`👋 User ${message.data.userId} left room ${message.data.roomId}`);
			break;

		case 'chat.message':
			const isOwn = message.data.from === userId;
			const prefix = isOwn ? '💬 You' : `💬 ${message.data.from}`;
			console.log(`${prefix}: ${message.data.message}`);
			break;

		case 'chat.private_message':
			const isOwnPM = message.data.senderId === userId;
			const pmPrefix = isOwnPM ? '🔒 You (PM)' : `🔒 ${message.data.from} (PM)`;
			console.log(`${pmPrefix}: ${message.data.message}`);
			break;

		case 'chat.systemMessage':
			console.log(`📢 System: ${message.data.message}`);
			break;

		case 'error':
			console.log(`❌ Error: ${message.data.message}`);
			break;

		default:
			console.log('📨 Received:', JSON.stringify(message, null, 2));
	}
}

function sendEvent(ws, event, data) {
	if (!ws || ws.readyState !== WebSocket.OPEN) {
		console.log('❌ WebSocket not connected');
		return;
	}

	const message = {
		event: event,
		data: data
	};

	ws.send(JSON.stringify(message));
}

function handleInput(ws, input) {
	const trimmed = input.trim();

	if (!trimmed) return;

	// Handle commands
	if (trimmed.startsWith('/')) {
		const parts = trimmed.split(' ');
		const command = parts[0];

		switch (command) {
			case '/join':
				if (parts[1]) {
					sendEvent(ws, 'chat.join', { roomId: parts[1] });
				} else {
					console.log('❌ Usage: /join <roomId>');
				}
				break;

			case '/leave':
				if (parts[1]) {
					sendEvent(ws, 'chat.leave', { roomId: parts[1] });
				} else {
					console.log('❌ Usage: /leave <roomId>');
				}
				break;

			case '/pm':
				if (parts.length >= 3) {
					const toUserId = parts[1];
					const message = parts.slice(2).join(' ');
					sendEvent(ws, 'chat.private_message', {
						toUserId: toUserId,
						message: message
					});
				} else {
					console.log('❌ Usage: /pm <userId> <message>');
				}
				break;

			case '/quit':
				console.log('👋 Disconnecting...');
				ws.close();
				break;

			default:
				console.log('❌ Unknown command. Available commands: /join, /leave, /pm, /quit');
		}
	} else {
		// Send as room message to room123
		sendEvent(ws, 'chat.message', {
			roomId: 'room123',
			message: trimmed
		});
	}
}

async function main() {
	try {
		console.log('=== Chat Test User 2 ===\n');
		
		// Step 1: Login
		const cookies = await login();
		
		// Step 2: Connect WebSocket
		const ws = await connectWebSocket(cookies);
		
		// Step 3: Setup stdin for interactive input
		process.stdin.setEncoding('utf8');
		process.stdin.on('data', (data) => {
			handleInput(ws, data.toString());
		});

		console.log('📡 Chat session active. Start typing!\n');
		
	} catch (err) {
		console.error('❌ Fatal error:', err.message);
		process.exit(1);
	}
}

main();
