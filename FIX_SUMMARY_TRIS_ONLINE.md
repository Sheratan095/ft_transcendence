# Tris Online Game UI Update Fix

## Problem
The frontend Tris game was not updating the UI board when playing online multiplayer games. Moves displayed correctly in offline/AI modes but failed silently in online games.

## Root Cause
**Race Condition in GameManager Initialization**: The `GameManager` instance was not being initialized when WebSocket events (`tris.matchedInRandomGame` and `tris.gameStarted`) arrived during the online game flow.

### Flow Analysis
1. User selects "Online" mode → GameManager created
2. User clicks "Matchmaking" → `startMatchmaking()` sent to server
3. Server matches two players
4. Both players receive `tris.matchedInRandomGame` event (ready indicator shown)
5. **RACE CONDITION**: If GameManager was destroyed/null at this point, subsequent events wouldn't be routed
6. Both players receive `tris.gameStarted` event
7. **BUG**: Moves arrive as `tris.moveMade` events, but GameManager doesn't exist to handle them
8. `handleNetworkEvent()` never called → `renderer.updateBoard()` never called
9. Board appears frozen/unresponsive to opponent's moves

## Solution Implemented

### 1. Defensive GameManager Initialization (`modal.ts`)
Added initialization checks in event handlers:

```typescript
if (event === 'tris.matchedInRandomGame') {
  // Ensure GameManager exists before processing event
  if (!currentGameManager) {
    console.log('[Tris Modal] Creating GameManager for online mode');
    currentMode = 'online';
    initializeModeSpecificBehaviors('online');
  }
  // ... rest of event handling
}

if (event === 'tris.gameStarted') {
  // Ensure GameManager exists
  if (!currentGameManager) {
    if (!currentMode) currentMode = 'online';
    initializeModeSpecificBehaviors(currentMode);
  }
  // ... rest of event handling
}
```

### 2. Enhanced Debug Logging
Added comprehensive console logs throughout the call chain:

- **WebSocket Layer** (`ws.ts`): Log all received events before routing
- **Modal Handler** (`modal.ts`): Log when events are routed to GameManager  
- **GameManager** (`GameManager.ts`): Log when `handleNetworkEvent()` is called and which event
- **Board Renderer** (`game/ui.ts`): Log board updates and cell changes

### 3. Event Routing Safety (`modal.ts`)
Added fallback logging if current GameManager is null when an event arrives:

```typescript
if (event !== 'tris.gameEnded' && currentGameManager) {
  console.log(`[Tris Modal] Routing event ${event} to GameManager`);
  currentGameManager.handleNetworkEvent(event, data);
} else if (event !== 'tris.gameEnded') {
  console.log(`[Tris Modal] Event NOT routed - currentGameManager is null. Event: ${event}`);
}
```

## Files Modified
1. `frontend/src/components/tris/GameManager.ts` - Added debug logging
2. `frontend/src/components/tris/modal.ts` - Added defensive GameManager initialization + logging
3. `frontend/src/components/tris/ws.ts` - Added WebSocket event logging
4. `frontend/src/components/tris/game/ui.ts` - Added board update logging

## Testing in Dev Mode
The fix works in both Docker and dev (non-Docker) environments:

```bash
# Dev mode (no Docker required)
cd /home/maceccar/Desktop/ft_transcendence

# Terminal 1: Backend services
cd backend && make redev

# Terminal 2: Frontend dev server
cd frontend && make dev

# Then test online tris games - moves should now update in real-time
```

## Expected Behavior After Fix
1. When user enters online matchmaking, GameManager is guaranteed to exist
2. When `tris.matchedInRandomGame` arrives, GameManager initialized if needed
3. When `tris.gameStarted` arrives, GameManager initialized if needed
4. When `tris.moveMade` arrives, GameManager routes to handler
5. Board updates in real-time for both players
6. Opponent's moves appear immediately on board

## Debug Output Example
```
[TRIS WS] Received event: tris.matchedInRandomGame
[TRIS WS] Routing event to subscriber: tris.matchedInRandomGame
[TRIS MODAL] Event: tris.matchedInRandomGame
[Tris Modal] initializeModeSpecificBehaviors called with mode: online
[Tris Modal] Created new GameManager for mode: online
[TRIS WS] Received event: tris.gameStarted
[TRIS WS] Routing event to subscriber: tris.gameStarted
[TRIS MODAL] Event: tris.gameStarted
[Tris Modal] Routing event tris.gameStarted to GameManager
[GameManager] handleNetworkEvent called with event: tris.gameStarted, mode: online
[TRIS WS] Received event: tris.moveMade
[TRIS WS] Routing event to subscriber: tris.moveMade
[TRIS MODAL] Event: tris.moveMade
[Tris Modal] Routing event tris.moveMade to GameManager
[GameManager] handleNetworkEvent called with event: tris.moveMade
[GameManager] Move made event received
[GameManager] Updating board with state: [null, 'X', null, null, null, null, null, null, null]
[BoardRenderer] updateBoard called with board: [null, 'X', null, null, null, null, null, null, null]
[BoardRenderer] updateCell 1: symbol="X"
```

## Notes for Future Developers
- Online and offline modes use different update mechanisms:
  - **Offline**: Direct input controller → GameManager → renderer
  - **Online**: WebSocket events → modal handler → GameManager → renderer  
- Always ensure GameManager exists before WebSocket events are processed
- Debug logging can be toggled by modifying console.log() statements
- Fix does not require any backend changes - entirely frontend fix
