import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3003/ws');

ws.on('open', () => {
    console.log('✅ Connected');
    ws.send('Hello from quick test!');
    console.log('📤 Sent message');
});

ws.on('message', (data) => {
    console.log('📥 Received:', data.toString());
    ws.close();
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
