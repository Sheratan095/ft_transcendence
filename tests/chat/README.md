# Chat Service Test Application

A comprehensive web-based testing client for the Chat microservice. This application allows you to test real-time chat functionality with multiple users simultaneously.

## Features

- **User Authentication**: Login with email/password through the Gateway
- **Real-time WebSocket Communication**: Instant message delivery
- **Group Chats**: Create and participate in group conversations
- **Private Messages**: Send direct messages to other users
- **Message Status Tracking**: See when messages are sent, delivered, and read
- **Multi-user Testing**: Open multiple browser windows/tabs to test different users
- **Modern UI**: Dark-themed, responsive interface with real-time updates

## Quick Start

### Important: HTTPS Required

Because the backend uses `secure: true` HTTP-only cookies, the test client **must be served over HTTPS** to work properly. Opening the file directly (`file://`) or using HTTP (`http://localhost`) will not work.

### Option 1: Using Python HTTPS Server (Recommended)

```bash
cd tests/chat

# Generate self-signed certificate (one-time setup)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# Start HTTPS server
python3 -m http.server 8443 --bind localhost --protocol HTTPS
```

Then open `https://localhost:8443/chat-test.html` in your browser.

**Note**: You'll need to accept the security warning for the self-signed certificate.

### Option 2: Using Node.js HTTPS Server

```bash
cd tests/chat
npm install -g http-server

# Generate certificate if you haven't already
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# Start server
http-server -S -C cert.pem -K key.pem -p 8443
```

Then open `https://localhost:8443/chat-test.html`

### Option 3: Direct File Open (Won't Work)

❌ **This will NOT work** due to secure cookie requirements:
- Opening `chat-test.html` directly from your file system
- The browser won't send secure cookies from file:// protocol

## Testing Multi-User Scenarios

1. **Open Multiple Browser Windows/Tabs**: Each window can represent a different user
2. **Use Different Test Users**:
   - User 1: `test1@gmail.com` / `1234`
   - User 2: `test2@gmail.com` / `1234`
   - User 3: `test3@gmail.com` / `1234`
   - (Add more test users as needed)

3. **Test Scenarios**:
   - Login with different users in different windows
   - Send messages between users
   - Create group chats
   - Test message delivery and read receipts
   - Test offline message delivery (close one window, send message, reopen)

## Features Guide

### Login
1. Enter email and password (defaults are pre-filled)
2. Click "Login & Connect"
3. The app will authenticate and establish a WebSocket connection

### Chat List (Sidebar)
- Shows all your chats (groups and DMs)
- Click on a chat to view messages
- Active chat is highlighted in green

### Sending Messages
- **Room/Group Messages**: Select a chat and type in the input field
- **Private Messages**: Click "+ Private Message", enter user ID and message
- Press Enter or click Send button

### Creating Group Chats
1. Click "+ Group" in the sidebar header
2. Enter a group name
3. Click "Create"
4. The new group will appear in your chat list

### Message Status Indicators
- **sent**: Message sent to server but recipient offline
- **delivered**: Message delivered to recipient's device
- **read**: Recipient has read the message

### Load More Messages
- Click "Load More" button in the chat header to load older messages
- Loads 50 messages at a time

## WebSocket Events

The application handles these WebSocket events:

### Outgoing (Client → Server)
- `ping`: Keep-alive heartbeat
- `chat.message`: Send message to a room/group
- `chat.private_message`: Send private message to a user
- `chat.read`: Mark chat messages as read

### Incoming (Server → Client)
- `pong`: Heartbeat response
- `chat.message`: Receive room/group message
- `chat.private_message`: Receive private message
- `chat.systemMessage`: System notifications
- `chat.messageSent`: Message send confirmation
- `chat.messageStatusUpdate`: Message status changed
- `error`: Error notifications

## API Endpoints Used

- `POST /auth/login` - User authentication
- `GET /chat/` - Get user's chats
- `GET /chat/chat-messages` - Get messages for a chat
- `POST /chat/create-group-chat` - Create a new group chat
- `WS /chat/ws` - WebSocket connection for real-time chat

## Configuration

The application is configured to connect to:
- **Gateway URL**: `https://localhost:3000`
- **WebSocket URL**: `wss://localhost:3000/chat/ws`

To modify these, edit the constants at the top of the `<script>` section in `chat-test.html`:

```javascript
const GATEWAY_URL = 'https://localhost:3000';
const WS_URL = 'wss://localhost:3000/chat/ws';
```

## Troubleshooting

### WebSocket Connection Fails
- Ensure the gateway and chat service are running
- Check that certificates are properly configured for HTTPS/WSS
- Open browser console (F12) to see detailed error messages

### SSL Certificate Errors
If using self-signed certificates in development:
- The browser may block the connection
- Visit `https://localhost:3000` first and accept the certificate warning
- Then return to the test application

### Messages Not Appearing
- Check WebSocket connection status in the bottom status bar
- Ensure you're logged in correctly
- Open browser console to see any errors
- Verify the chat service is running on port 3004

### Can't Send Messages
- Ensure a chat is selected (highlighted in green)
- Check WebSocket connection is active (green "Connected" status)
- Verify you have permission to send to that chat

## Development Tips

### Testing Message Delivery
1. Open two browser windows side by side
2. Login as different users
3. Send a private message from User 1 to User 2
4. Observe real-time delivery in User 2's window

### Testing Read Receipts
1. Send a message from User 1
2. Wait for "delivered" status
3. Open the chat in User 2's window
4. Status should change to "read"

### Testing Group Chats
1. Create a group as User 1
2. Note the group's chat ID
3. Use the internal API or another user to join the group
4. Send messages from multiple users

### Browser Console Logging
- Open Developer Tools (F12)
- Console tab shows detailed WebSocket messages
- Network tab shows HTTP requests
- Useful for debugging connection issues

## Comparison with Existing Tests

This test application improves upon the existing Node.js tests (`chat-user1.mjs`, `chat-user2.mjs`) by providing:

- **Visual Interface**: See messages and chats in a user-friendly UI
- **Multi-user in One Place**: No need to switch between terminal windows
- **Real-time Updates**: Instant visual feedback on message delivery
- **Message History**: Browse and load older messages
- **Status Tracking**: Visual indicators for message status
- **Easier Testing**: No need to remember commands or syntax

## Known Limitations

- No typing indicators (can be added if backend supports it)
- No file/image uploads (text only)
- No message editing or deletion
- No user search functionality
- Limited error recovery (need to refresh page sometimes)

## Future Enhancements

Potential improvements:
- Add user search to find users for private messages
- Display online/offline status for users
- Show typing indicators
- Add emoji picker
- Message notifications (browser notifications API)
- Dark/light theme toggle
- Export chat history
- Add/remove users from group chats
- Chat settings and customization
