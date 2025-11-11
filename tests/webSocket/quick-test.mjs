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
const ws = new WebSocket('ws://localhost:3000/', {
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
    console.log('📥 Received:', data.toString());
    // ws.close();
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
setTimeout(() => {
    console.log('⏱️ Timeout - no response received');
    ws.close();
    process.exit(1);
}, 5000);
