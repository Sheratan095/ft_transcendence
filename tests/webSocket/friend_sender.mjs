import WebSocket from 'ws';

// Disable SSL certificate validation for self-signed certificates in development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Sender script - simulates a user sending friend requests and accepting them
 * Tests the friend request flow with EMPTY target_id to trigger validation errors
 */

const SENDER_EMAIL = 'pippo@gmail.com';
const SENDER_PASSWORD = 'Mrco@123_';
const SENDER_USERNAME = 'pippo';
const TARGET_USERNAME = 'baudo';
const GATEWAY_URL = 'https://localhost:3000';

let accessToken = '';
let refreshToken = '';

async function register() {
    console.log('🔐 Logging in as sender...');
    const response = await fetch(`${GATEWAY_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            email: SENDER_EMAIL, 
            password: SENDER_PASSWORD,
        })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    // Extract cookies
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
        throw new Error('No cookies received from register');
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

    console.log('✅ Login successful');
    console.log('🍪 Cookies obtained\n');
    
    return cookies;
}

async function connectWebSocket(cookies) {
    return new Promise((resolve, reject) => {
        console.log('🔌 Connecting to WebSocket...');
        const ws = new WebSocket('wss://localhost:3000/notifications/ws', {
            headers: {
                'Cookie': cookies
            },
            rejectUnauthorized: false // Accept self-signed certificates
        });

        ws.on('open', () => {
            console.log('✅ WebSocket connected successfully!\n');
            resolve(ws);
        });

        ws.on('message', (data) => {
            const rawMessage = data.toString();
            console.log('📥 Received notification:');
            console.log('   Raw:', rawMessage);
            
            try {
                const message = JSON.parse(rawMessage);
                console.log('   Parsed:', JSON.stringify(message, null, 2));
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
            reject(err);
        });
    });
}

async function getTargetUserId(cookies) {
    console.log(`🔍 Fetching user ID for ${TARGET_USERNAME}...`);
    
    try {
        // Get all users and find the target by username
        const response = await fetch(`${GATEWAY_URL}/users/user?username=${TARGET_USERNAME}`, {
            method: 'GET',
            headers: {
                'Cookie': cookies
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
        }

        const targetUser = await response.json();

        if (!targetUser) {
            throw new Error(`Target user '${TARGET_USERNAME}' not found`);
        }

        console.log(`✅ Found target user: ${targetUser.username} (ID: ${targetUser.id})\n`);
        return targetUser.id;
    } catch (err) {
        console.error('❌ Error fetching target user ID:', err.message);
        throw err;
    }
}

async function sendFriendRequest(cookies, targetId) {
    console.log(`📤 Sending friend request with targetId: "${targetId}"`);
    
    try {
        const response = await fetch(`${GATEWAY_URL}/users/relationships/request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({ targetId })
        });

        const data = await response.json();
        
        console.log(`Response status: ${response.status}`);
        console.log('Response body:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log('✅ Friend request sent successfully!\n');
        } else {
            console.log('❌ Failed to send friend request');
            console.log(`   Error: ${data.error || data.message}\n`);
        }
        
        return response.ok;
    } catch (err) {
        console.error('❌ Error sending friend request:', err.message);
        return false;
    }
}

async function acceptFriendRequest(cookies, requesterId = '') {
    console.log(`📤 Accepting friend request from requesterId: "${requesterId}"...`);
    
    try {
        const response = await fetch(`${GATEWAY_URL}/users/relationships/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            },
            body: JSON.stringify({ requesterId })
        });

        const data = await response.json();
        
        console.log(`Response status: ${response.status}`);
        console.log('Response body:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log('✅ Friend request accepted successfully!\n');
        } else {
            console.log('❌ Failed to accept friend request');
            console.log(`   Error: ${data.error || data.message}\n`);
        }
        
        return response.ok;
    } catch (err) {
        console.error('❌ Error accepting friend request:', err.message);
        return false;
    }
}

async function main() {
    try {
        // Step 1: register
        const cookies = await register();
        
        // Step 2: Connect WebSocket to receive notifications
        const ws = await connectWebSocket(cookies);
        
        // Wait a bit to ensure connection is stable
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Get target user ID dynamically
        const targetId = await getTargetUserId(cookies);
        
        // Step 4: Test sending friend request
        await sendFriendRequest(cookies, targetId);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    
        
        console.log('\n✅ All tests completed!');
        console.log('📡 Keeping WebSocket open to monitor any late notifications...');
        console.log('Press Ctrl+C to exit\n');
        
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
        process.exit(1);
    }
}

main();