import WebSocket from 'ws';

/**
 * Receiver script - simulates a user receiving friend request notifications
 * This user logs in and keeps a WebSocket connection open to receive notifications
 */

const RECEIVER_EMAIL = 'baudo@gmail.com';
const RECEIVER_USERNAME = 'baudo'; 
const RECEIVER_PASSWORD = 'Mrco@123_';

async function acceptFriendRequest(requesterId, accepterUsername, cookies) {
    console.log(`\n➡️ Accepting friend request from ID ${requesterId} as ${accepterUsername}...`);
    try {
        const response = await fetch('http://localhost:3000/relationships/accept', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie' : cookies
            },
            body: JSON.stringify({
                requesterId: requesterId,
            })
        });

        console.log(response);

        if (!response.ok) {
            throw new Error(`Failed to accept friend request: ${response.statusText}`);
        }

        console.log(`✅ Friend request from ID ${requesterId} accepted by ${accepterUsername}`);
    } catch (error) {
        console.error('❌ Error accepting friend request:', error.message);
    }
}

async function startReceiver() {
    try {
        // Login to get JWT tokens
        console.log('🔐 Registering as receiver...');
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: RECEIVER_EMAIL, 
                password: RECEIVER_PASSWORD,
                username: RECEIVER_USERNAME
            })
        });

        if (!response.ok) {
            throw new Error(`Login failed: ${response.statusText}`);
        }

        // Extract cookies
        const cookies = response.headers.get('set-cookie');
        if (!cookies) {
            throw new Error('No cookies received from login');
        }

        console.log('✅ Login successful');
        console.log('🍪 Cookies:', cookies);
		// print the user id

        // Connect to WebSocket with authentication
        console.log('🔌 Connecting to WebSocket...');
        const ws = new WebSocket('ws://localhost:3000/ws', {
            headers: {
                'Cookie': cookies
            }
        });

        ws.on('open', () => {
            console.log('\n✅ WebSocket connected successfully!');
            console.log('📡 Waiting for notifications...\n');
        });

        ws.on('message', (data) => {
            const rawMessage = data.toString();
            console.log('📥 Received notification:');
            console.log('   Raw:', rawMessage);
            
            try {
                const message = JSON.parse(rawMessage);
                console.log('   Parsed:', JSON.stringify(message, null, 2));
                
                if (message.event === 'friend.request') {
                    console.log('\n🎉 Friend request received!');
                    console.log(`   From: ${message.data.requesterUsername}`);
                    // Automatically accept the friend request for testing
                    acceptFriendRequest(message.data.requesterId, message.data.targetUsername, cookies);
                }
                else if (message.event === 'friend.accept') {
                    console.log('\n🎉 Friend request accepted!');
                    console.log(`   By: ${message.data.accepterUsername}`);
                }
            } catch (err) {
                console.log('   (Not JSON format)');
            }
            console.log('');
        });

        ws.on('close', () => {
            console.log('❌ WebSocket connection closed');
        });

        ws.on('error', (err) => {
            console.error('❌ WebSocket error:', err.message);
        });

        // Keep the script running
        console.log('Press Ctrl+C to exit\n');
        
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

startReceiver();