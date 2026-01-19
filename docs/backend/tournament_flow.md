# Tournament System - Implementation Guide

## Overview
The tournament system supports **parallel matches** with **ready-up mechanics** and **automatic bracket progression**. No third-place match is included.

**Architecture**: TournamentInstance **owns and creates** all GameInstance objects, forming a clean tree structure:
```
TournamentInstance
  └── rounds[]
       └── GameInstance[] (matches)
           └── game state, physics, scores
```

## Tournament Flow

### 1. Creation & Joining Phase
- **Creator** creates tournament via REST API
- **Participants** join via REST API  
- Tournament status: `WAITING`
- Minimum players required (configurable via `MIN_PLAYERS_FOR_TOURNAMENT_START`)

### 2. Tournament Start
- **Creator** starts tournament via WebSocket: `tournament.start`
- System shuffles participants and creates first round bracket
- All matches created in parallel for the round
- Tournament status: `IN_PROGRESS`
- Each match status: `WAITING_READY`

### 3. Ready-Up Phase (Per Match)
- Players receive round info via `pong.tournamentRoundInfo` event
- Each player sends: `tournament.ready` with `tournamentId`
- When **both players ready**, TournamentInstance starts the match
- GameInstance already exists (created during round creation), just starts game loop
- Match registered with GameManager for paddle moves and physics processing
- GameInstance marked with:
  - `isTournamentGame: true`
  - `tournamentId`
  - `matchId`
- Game begins immediately

### 4. Match Execution
- Standard pong game runs (same as regular games)
- GameInstance marked with:
  - `type: 'TOURNAMENT'`
  - `tournamentId`
  - `matchId`
- Game tracked in both GameManager and TournamentManager

### 5. Match Completion
- When game ends, `TournamentManager.handleGameEnd()` called
- Winner recorded in match
- Match status: `FINISHED`
- All participants notified via `pong.tournamentMatchEnded`

### 6. Round Progression
- When **all matches in round complete**, system checks:
  - If only 1 winner: Tournament ends
  - If multiple winners: Create next round with winners
- New round created automatically with winner pairings
- Players receive new `pong.tournamentRoundInfo`
- Back to Ready-Up Phase (step 3)

### 7. Tournament End
- Final match completes
- Tournament status: `FINISHED`
- All participants notified via `pong.tournamentEnded`
- Tournament deleted from memory

## Bracket System

### Round Creation
```javascript
Round 1: [P1 vs P2, P3 vs P4, P5 vs P6, P7 (bye)]
         Winners: [W1, W2, W3, P7]
Round 2: [W1 vs W2, W3 vs P7]
         Winners: [W12, W34]
Final:   [W12 vs W34]
         Winner: Champion
```

### Bye Handling
- If odd number of players in a round, last player gets automatic bye
- Bye match immediately marked as `FINISHED`
- Player advances to next round without playing

## WebSocket Events

### Client → Server
| Event | Data | Description |
|-------|------|-------------|
| `tournament.ready` | `{tournamentId}` | Player ready for their match |

### Server → Client
| Event | Data | Description |
|-------|------|-------------|
| `pong.tournamentStarted` | `{tournamentId, tournamentName}` | Tournament has started |
| `pong.tournamentRoundInfo` | `{roundNumber, totalMatches, playerMatch}` | Round bracket info |
| `pong.tournamentPlayerReady` | `{matchId, readyUserId}` | Opponent is ready |
| `pong.tournamentMatchStarted` | `{gameId, matchId}` | Your match is starting |
| `pong.tournamentMatchEnded` | `{matchId, winnerId, winnerUsername}` | Match result |
| `pong.tournamentEnded` | `{tournamentId, winnerId, winnerUsername}` | Tournament complete |

## Data Structures

### TournamentInstance
```javascript
{
  id: string,
  name: string,
  creatorId: string,
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED',
  participants: Set<{userId, username}>,
  currentRound: number,
  rounds: Array<(GameInstance|ByeMatch)[]>, // Owns all game instances
  winner: {userId, username} // Only when finished
}
```

### GameInstance (in Tournament)
```javascript
{
  id: string (gameId),
  matchId: string,
  tournamentId: string,
  isTournamentGame: true,
  playerLeftId: string,
  playerRightId: string,
  playerLeftUsername: string,
  playerRightUsername: string,
  playerLeftReady: boolean,
  playerRightReady: boolean,
  gameStatus: 'WAITING' | 'IN_PROGRESS' | 'FINISHED',
  winner: {userId, username} | null,
  // ... standard game state (ball, paddles, scores, etc.)
}
```

### ByeMatch (for odd-numbered rounds)
```javascript
{
  id: string,
  matchId: string,
  player1: {userId, username},
  player2: null,
  gameStatus: 'FINISHED',
  winner: {userId, username},
  isBye: true
}
```

## Architecture Benefits

**Clean Tree Structure:**
- TournamentInstance owns all GameInstances
- No separate tracking maps needed
- Easy to find games: `tournament.getAllGames()`
- Automatic cleanup when tournament ends

**Separation of Concerns:**
- TournamentInstance: Game creation, bracket logic, round progression
- GameManager: Game loop processing, paddle moves, physics
- TournamentManager: Coordination, WebSocket communication

## Client Implementation Guide

### 1. Listen for tournament start
```javascript
ws.on('pong.tournamentStarted', (data) => {
  showMessage(`Tournament ${data.tournamentName} is starting!`);
});
```

### 2. Receive round/match info
```javascript
ws.on('pong.tournamentRoundInfo', (data) => {
  if (data.playerMatch) {
    showReadyButton();
    displayMatch(data.playerMatch);
  } else {
    showSpectatorView(data);
  }
});
```

### 3. Ready up
```javascript
readyButton.onclick = () => {
  ws.send(JSON.stringify({
    event: 'tournament.ready',
    data: { tournamentId: currentTournamentId }
  }));
};
```

### 4. Handle match start
```javascript
ws.on('pong.tournamentMatchStarted', (data) => {
  startPongGame(data.gameId);
});
```

### 5. Track match results
```javascript
ws.on('pong.tournamentMatchEnded', (data) => {
  updateBracket(data.matchId, data.winnerId);
  
  if (data.winnerId === myUserId) {
    showMessage("You won! Waiting for next round...");
  } else {
    showMessage("You lost. Thanks for playing!");
  }
});
```

### 6. Tournament completion
```javascript
ws.on('pong.tournamentEnded', (data) => {
  if (data.winnerId === myUserId) {
    showVictoryScreen();
  } else {
    showMessage(`${data.winnerUsername} won the tournament!`);
  }
});
```

## Key Features

✅ **Parallel Matches**: All matches in a round run simultaneously  
✅ **Ready-Up System**: Both players must confirm before match starts  
✅ **Automatic Progression**: Winners automatically advance to next round  
✅ **Bye Support**: Odd-numbered rounds handled gracefully  
✅ **Real-time Updates**: All participants see match results  
✅ **No Third Place**: Tournament ends when final match completes

## Configuration

Environment variables (in `.env`):
```bash
MIN_PLAYERS_FOR_TOURNAMENT_START=2  # Minimum players to start tournament
```

## Error Handling

- If player disconnects during tournament: TO DO (currently removes from tournament)
- If player quits during match: Opponent wins automatically (standard quit logic)
- Invalid ready-up: Error message sent to player
