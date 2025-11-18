# Chat Service Setup Guide

## Overview
The chat service provides real-time WebSocket-based communication for users to exchange messages in chat rooms.

## Architecture
- **Service**: `backend/services/chat` (runs on its own port)
- **Gateway**: WebSocket connections proxy through gateway at `/chat/ws`
- **Authentication**: JWT-based authentication via cookies (handled by gateway)

## WebSocket Events

### Client → Server Events

1. **Join Room**
```javascript
{
  event: 'chat.join',
  data: { roomId: 'room123' }
}
```

2. **Leave Room**
```javascript
{
  event: 'chat.leave',
  data: { roomId: 'room123' }
}
```

3. **Send Message**
```javascript
{
  event: 'chat.message',
  data: {
    roomId: 'room123',
    message: 'Hello world!',
    username: 'John'
  }
}
```

4. **Typing Indicator**
```javascript
{
  event: 'chat.typing',
  data: {
    roomId: 'room123',
    username: 'John',
    isTyping: true
  }
}
```

### Server → Client Events

1. **Joined Room Confirmation**
```javascript
{
  event: 'chat.joined',
  data: { roomId: 'room123' }
}
```

2. **User Joined Notification**
```javascript
{
  event: 'chat.userJoined',
  data: { userId: '123', roomId: 'room123' }
}
```

3. **User Left Notification**
```javascript
{
  event: 'chat.userLeft',
  data: { userId: '123', roomId: 'room123' }
}
```

4. **Chat Message**
```javascript
{
  event: 'chat.message',
  data: {
    roomId: 'room123',
    userId: '123',
    username: 'John',
    message: 'Hello world!',
    timestamp: '2025-11-17T...'
  }
}
```

5. **Typing Indicator**
```javascript
{
  event: 'chat.typing',
  data: {
    userId: '123',
    username: 'John',
    isTyping: true
  }
}
```

6. **System Message**
```javascript
{
  event: 'chat.system',
  data: {
    roomId: 'room123',
    message: 'Server maintenance in 5 minutes',
    timestamp: '2025-11-17T...'
  }
}
```

7. **Error**
```javascript
{
  event: 'error',
  data: { message: 'Invalid message format' }
}
```

## HTTP API Endpoints (Internal)

### Send System Message
```bash
POST /send-system-message
Headers: x-internal-api-key: <key>
Body: { roomId: 'room123', message: 'System message' }
```

### Get Connection Stats
```bash
GET /stats
Headers: x-internal-api-key: <key>
Response: { connectedUsers: 42 }
```

## Environment Variables

### Chat Service
```bash
PORT=3002
INTERNAL_API_KEY=your-internal-key
```

### Gateway
```bash
CHAT_SERVICE_URL=http://localhost:3002
# ... other existing variables
```

## Running the Services

1. **Start Chat Service**
```bash
cd backend/services/chat
npm install
npm start
# or for development with auto-reload:
npm run dev
```

2. **Start Gateway** (if not already running)
```bash
cd backend/gateway
npm start
```

3. **Test Connection**
- Open `tests/webSocket/chat-test.html` in a browser
- Make sure you're authenticated (have JWT cookies)
- Click "Connect" to establish WebSocket connection
- Join a room and start chatting

## Testing

### Browser Test Client
Open `tests/webSocket/chat-test.html` in multiple browser tabs to test real-time messaging.

### Manual WebSocket Test (using wscat)
```bash
# Install wscat if needed
npm install -g wscat

# Connect (you'll need cookies with valid JWT)
wscat -c "ws://localhost:3000/chat/ws" --header "Cookie: access_token=<your_token>"

# Send join room event
{"event":"chat.join","data":{"roomId":"test-room"}}

# Send message
{"event":"chat.message","data":{"roomId":"test-room","message":"Hello!","username":"TestUser"}}
```

## Features

✅ **Real-time messaging** - Instant message delivery to all room participants  
✅ **Room-based chat** - Multiple isolated chat rooms  
✅ **Typing indicators** - See when others are typing  
✅ **Connection management** - Automatic cleanup on disconnect  
✅ **System messages** - Server-side message broadcasting  
✅ **JWT authentication** - Secure WebSocket connections  
✅ **Rate limiting** - Protection against abuse via gateway  

## Connection Flow

1. Client connects to `ws://localhost:3000/chat/ws`
2. Gateway authenticates JWT from cookies
3. Gateway proxies connection to chat service at `/ws`
4. Chat service validates internal API key
5. User ID extracted and connection stored
6. Client can now join rooms and send messages

## Room Management

- Rooms are created automatically when first user joins
- Rooms are destroyed when last user leaves
- Users can be in multiple rooms simultaneously
- Messages only sent to users in the same room

## Future Enhancements

- [ ] Persistent message storage (database)
- [ ] Message history retrieval
- [ ] Direct messaging (1-on-1 chat)
- [ ] Read receipts
- [ ] File/image sharing
- [ ] Voice/video chat support
- [ ] Message reactions
- [ ] User presence tracking
