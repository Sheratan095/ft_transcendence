# Pong Game Loop and Communication Architecture

## Overview
This document explains how the real-time Pong game handles the game loop and communicates with players through WebSockets.

## Game Loop Architecture

### 1. Server-Side Game Loop

The game loop runs on the server at 60 FPS (16.67ms intervals) and handles:
- Ball physics and movement
- Collision detection (ball with walls and paddles)
- Score tracking
- Game state broadcasting

#### Key Components:

**GameInstance.js**
- Maintains game state (ball position, paddle positions, scores)
- Runs the physics simulation
- Handles collision detection
- Manages game lifecycle (start, pause, end)

**Game State Structure:**
```javascript
gameState = {
    ball: {
        x: 400,     // X position
        y: 200,     // Y position  
        vx: 3,      // X velocity
        vy: 1,      // Y velocity
        speed: 3    // Current speed multiplier
    },
    paddles: {
        [playerLeftId]: {
            x: 10,      // Fixed X position
            y: 150,     // Y position (controlled by player)
            width: 10,  // Paddle width
            height: 100 // Paddle height
        },
        [playerRightId]: {
            x: 780,     // Fixed X position  
            y: 150,     // Y position (controlled by player)
            width: 10,
            height: 100
        }
    }
}
```

### 2. Game Loop Flow

1. **Update Ball Position** - Ball moves based on velocity
2. **Check Wall Collisions** - Ball bounces off top/bottom walls
3. **Check Paddle Collisions** - Ball bounces off paddles with spin
4. **Check Scoring** - Detect if ball passed paddles
5. **Broadcast State** - Send updates to clients (every 2nd frame to reduce network traffic)

### 3. Physics Implementation

#### Ball Movement
- Ball position updated using: `position += velocity * speed * deltaTime`
- Speed increases slightly after each paddle hit (up to maximum)
- Spin added based on where ball hits paddle

#### Collision Detection
- **Wall Collision**: `ball.y <= radius || ball.y >= canvas.height - radius`
- **Paddle Collision**: AABB (Axis-Aligned Bounding Box) collision detection

## Communication Protocol

### 1. WebSocket Events

#### Client to Server:
- `pong.paddleMove` - Player paddle movement
- `pong.joinMatchmaking` - Join random game queue
- `pong.leaveMatchmaking` - Leave matchmaking
- `pong.userReady` - Mark as ready in lobby
- `pong.userNotReady` - Mark as not ready

#### Server to Client:
- `pong.gameState` - Full game state update
- `pong.paddleMove` - Paddle position update
- `pong.score` - Score update
- `pong.gameStarted` - Game begins
- `pong.gameEnded` - Game finished
- `pong.matchedInRandomGame` - Found opponent

### 2. Message Formats

#### Paddle Movement
```javascript
// Client sends:
{
    "event": "pong.paddleMove",
    "data": {
        "gameId": "game-uuid",
        "direction": "up" | "down"
    }
}

// Server broadcasts:
{
    "event": "pong.paddleMove", 
    "data": {
        "gameId": "game-uuid",
        "playerId": "player-uuid",
        "paddleY": 150
    }
}
```

#### Game State Update
```javascript
{
    "event": "pong.gameState",
    "data": {
        "gameId": "game-uuid",
        "ball": {
            "x": 400,
            "y": 200,
            "vx": 3,
            "vy": 1
        },
        "paddles": {
            "player1-id": { "x": 10, "y": 150, "width": 10, "height": 100 },
            "player2-id": { "x": 780, "y": 150, "width": 10, "height": 100 }
        },
        "scores": {
            "player1-id": 2,
            "player2-id": 1
        }
    }
}
```

### 3. Network Optimization

#### Update Frequency
- Game loop runs at 60 FPS
- State broadcasts sent every 2nd frame (30 FPS) to reduce bandwidth
- Paddle movements sent immediately for responsiveness

#### State Synchronization
- Server is authoritative (clients cannot cheat)
- Clients render interpolated state for smooth visuals
- Client input has immediate local feedback

## Client-Side Implementation

### 1. Input Handling
```javascript
// Continuous paddle movement while key held
function startPaddleMove(direction) {
    sendPaddleMove(direction);
    paddleMoveInterval = setInterval(() => {
        sendPaddleMove(direction);
    }, 50); // 20 FPS input rate
}
```

### 2. Rendering
- Client renders game state received from server
- Interpolation between updates for smooth animation
- Local prediction for paddle movement

### 3. Connection Management
- WebSocket connection with authentication
- Automatic reconnection on disconnect
- Graceful handling of network issues

## Game States and Lifecycle

### Game States
1. **WAITING** - Custom game waiting for opponent
2. **IN_LOBBY** - Both players connected, waiting for ready
3. **IN_PROGRESS** - Game actively running
4. **FINISHED** - Game completed

### Lifecycle Flow
1. Players join matchmaking or create custom game
2. Game moves to IN_LOBBY when both players found
3. Players mark ready, game starts (IN_PROGRESS)
4. Game loop runs until winning score reached
5. Game ends (FINISHED), cleanup resources

## Performance Considerations

### Server Performance
- Each game instance runs independent physics loop
- Games automatically cleaned up when finished
- Memory management for large numbers of concurrent games

### Network Performance
- Minimal data in each message
- Reduced update frequency for non-critical updates
- Binary protocols could be added for higher performance

### Scalability
- Stateless game instances
- Can be distributed across multiple servers
- Game state can be persisted to database

## Error Handling

### Connection Issues
- Graceful handling of player disconnections
- Opponent wins if player leaves during game
- Automatic cleanup of abandoned games

### Game State Validation
- Server validates all player inputs
- Impossible moves rejected with error messages
- Anti-cheat measures built into physics

## Testing
Use the provided `pong-game-test.html` file to test:
- WebSocket connection
- Matchmaking
- Paddle controls (mouse buttons or keyboard)
- Real-time game state updates
- Score tracking and game completion

## Future Enhancements
- Spectator mode
- Replay system  
- Power-ups and special effects
- Tournament brackets
- AI opponents
- Mobile touch controls