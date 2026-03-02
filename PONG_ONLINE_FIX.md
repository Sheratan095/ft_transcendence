# Pong Online UI Update Fix

## Problem
The Pong frontend wasn't updating the UI in online games (ball position, paddle positions, scores), but it was working correctly in offline games (local 1v1 and AI).

## Root Cause
The issue was that `localPlayerId` wasn't being properly set when an online game was matched. The `GameManager` initializes with `localPlayerId` defaulting to `"left"` (set in `modal.ts` during `openPongModal`), but when the player was actually matched on the RIGHT side, the `localPlayerId` wasn't updated.

This caused:
1. **Wrong input controller disabled**: If the player was on the right side but `localPlayerId` was still "left", the RIGHT LocalInputController was still trying to handle input (instead of being disabled)
2. **Server state applied to wrong side**: When the server sent game state updates with paddle positions, they were being applied to the wrong paddles
3. **No game state updates processed**: The `update()` loop would try to get movement from the wrong controller and fail to properly process server state

## Solution

### 1. Added `updateLocalPlayerId()` method to GameManager
Created a method that:
- Updates the `localPlayerId` property
- Properly enables/disables input controllers based on the new side
- Logs diagnostic information
- Only works in ONLINE mode

```typescript
updateLocalPlayerId(newSide: string): void
{
    // Validates and updates localPlayerId
    // Enables input for the local player's side
    // Disables input for the opponent's side
}
```

### 2. Updated all game initialization handlers
Modified these handlers to call `updateLocalPlayerId()` instead of directly setting the property:

- **`handleMatchedInRandomGame()`**: Called when player is matched in random matchmaking
  - Updates `localPlayerId` based on `yourSide` from server
  
- **`handleCustomGameCreated()`**: When a custom game is created
  - Creator is always LEFT: `updateLocalPlayerId('left')`
  
- **`handleCustomGameJoinSuccess()`**: When joining a custom game
  - Joiner is always RIGHT: `updateLocalPlayerId('right')`
  
- **`handleTournamentRoundInfo()`**: When a tournament round starts
  - Updates based on `yourSide` from server

### 3. Added diagnostic logging
Added console logs throughout the pipeline to trace:
- When game state is received (`handleGameState`)
- When game is initialized (`openPongModal`)
- When local player ID is updated (`updateLocalPlayerId`)
- When server state is processed (`GameManager.update`)
- Input controller states

## How the Fix Works

1. **During Online Game Initialization**:
   - `openPongModal('online')` creates a new GameManager in ONLINE mode
   - Initial `localPlayerId` defaults to `'left'`

2. **When Player is Matched**:
   - Server sends `pong.matchedInRandomGame` with `yourSide`
   - Handler calls `updateLocalPlayerId(yourSide)`
   - This enables the correct input controller and sets the right side

3. **During Game Updates**:
   - `GameManager.update()` runs every render frame
   - It checks `localPlayerId` to determine which controller's movement to send
   - It receives server game state via `networkController`
   - It applies the server state directly to both paddles correctly
   - 3D renderer reads updated game state and renders it

## Testing Checklist

- [ ] Online random matchmaking - UI updates correctly for both LEFT and RIGHT sides
- [ ] Custom games - Creator (LEFT) and Joiner (RIGHT) both see UI updates
- [ ] Tournament games - UI updates for all tournament rounds
- [ ] Offline modes still work (Local 1v1, AI)
- [ ] Paddle movement still works in online games
- [ ] Scores update when goals are scored
- [ ] Ready states display correctly

## Files Modified

1. **`frontend/src/components/pong/GameManager.ts`**
   - Added `updateLocalPlayerId()` method
   - Added diagnostic logging in `update()`

2. **`frontend/src/components/pong/modal.ts`**
   - Updated `handleMatchedInRandomGame()` to call `updateLocalPlayerId()`
   - Updated `handleCustomGameCreated()` to call `updateLocalPlayerId('left')`
   - Updated `handleCustomGameJoinSuccess()` to call `updateLocalPlayerId('right')`
   - Updated `handleTournamentRoundInfo()` to call `updateLocalPlayerId()`
   - Updated `handleGameStarted()` with diagnostic logging

3. **`frontend/src/components/pong/game/3d.ts`**
   - Added diagnostic logging in `updateOnlineState()`

4. **`frontend/src/components/pong/game/InputController.ts`**
   - Added diagnostic logging in `setServerGameState()`

## Debugging Console Output

When running the game in dev mode, watch the browser console for these logs to verify the fix:

```
[Modal] Game instance created. Mode: online localPlayerId: left
[GameManager] Updating localPlayerId from left to right
[GameManager] Disabled left input controller
[GameManager] Enabled right input controller
[GameManager] ONLINE mode update - hasNewServerState: true
[3D] updateOnlineState called
[3D] Setting server game state
[NetworkController] setServerGameState called. ball: {x: 0.5, y: 0.3}
```

This confirms the fix is working correctly.
