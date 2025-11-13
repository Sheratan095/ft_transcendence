import WebSocket from 'ws';

// login the user to get a valid jwt token in http cookies
const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ceccarellim7@gmail.com', password: 'Mrco@123_' })
});

if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
}

// Extract cookies from the response headers
const cookies = response.headers.get('set-cookie');
if (!cookies) {
    throw new Error('No cookies received from login');
}

console.log('🔑 Login successful, cookies received');
console.log('🍪 Cookies:', cookies);

// Create WebSocket connection with cookies in the headers
// NOTE: the notification service exposes the websocket route at '/ws'.
// The gateway proxies Upgrade requests to the notification service and
// forwards the original request path, so we must connect to '/ws'.
const ws = new WebSocket('ws://localhost:3000/ws', {
    headers: {
        'Cookie': cookies
    }
});

ws.on('open', () => {
    console.log('✅ Connected');
    ws.send('Hello from quick test!');
    console.log('📤 Sent message');
});

ws.on('message', (data) => {
    const rawMessage = data.toString();
    console.log('📥 Raw message:', rawMessage);
    
    try {
        // Try to parse as JSON (for structured events)
        const message = JSON.parse(rawMessage);
        
        // Handle different event types
        if (message.event) {
            console.log(`🎯 Event: ${message.event}`, message.data);
            
            // Handle specific events
            switch (message.event) {
                case 'friendOnline':
                    console.log('👥 Friend came online:', message.data);
                    break;
                case 'friendOffline':
                    console.log('� Friend went offline:', message.data);
                    break;
                default:
                    console.log('📦 Unknown event:', message.event);
            }
        }
    } catch (e) {
        // Not JSON, just a plain text message
        console.log('💬 Text message:', rawMessage);
    }
});

ws.on('close', () => {
    console.log('❌ Closed');
    process.exit(0);
});

ws.on('error', (error) => {
    console.error('⚠️ Error:', error.message);
    process.exit(1);
});

// Timeout after 5 seconds
// setTimeout(() => {
//     console.log('⏱️ Timeout - no response received');
//     ws.close();
//     process.exit(0);
// }, 5000);
