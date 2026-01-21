/**
 * WebSocket documentation for Swagger UI
 */
const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket documentation',
		description: `
Connection URL: ws://BASE_URL/pong/ws

**Authentication:**

The connection will be rejected (closed with code 1008) if JWT isn't provided in httponly cookie.

---

**CLIENT → SERVER EVENTS**

- **ping** - Health check
\`\`\`json
{
  "event": "ping",
  "data": {}
}
\`\`\`

- **pong.createCustomGame** - Create a custom game with a specific opponent
\`\`\`json
{
  "event": "pong.createCustomGame",
  "data": {
    "otherId": "user123"
  }
}
\`\`\`

- **pong.joinCustomGame** - Join an existing custom game
\`\`\`json
{
  "event": "pong.joinCustomGame",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.cancelCustomGame** - Cancel a custom game (creator only)
\`\`\`json
{
  "event": "pong.cancelCustomGame",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.userQuit** - Quit the current game
\`\`\`json
{
  "event": "pong.userQuit",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.userReady** - Mark yourself as ready in lobby
\`\`\`json
{
  "event": "pong.userReady",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.userNotReady** - Mark yourself as not ready in lobby
\`\`\`json
{
  "event": "pong.userNotReady",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.joinMatchmaking** - Join random matchmaking queue
\`\`\`json
{
  "event": "pong.joinMatchmaking",
  "data": {}
}
\`\`\`

- **pong.leaveMatchmaking** - Leave random matchmaking queue
\`\`\`json
{
  "event": "pong.leaveMatchmaking",
  "data": {}
}
\`\`\`

- **pong.paddleMove** - Move your paddle
\`\`\`json
{
  "event": "pong.paddleMove",
  "data": {
    "gameId": "game123",
    "direction": "up" // or "down"
  }
}
\`\`\`

- **tournament.leave** - Leave a tournament
\`\`\`json
{
  "event": "tournament.leave",
  "data": {
    "tournamentId": "tourney123"
  }
}
\`\`\`

- **tournament.start** - Start a tournament (creator only)
\`\`\`json
{
  "event": "tournament.start",
  "data": {
    "tournamentId": "tourney123"
  }
}
\`\`\`

- **tournament.ready** - Mark yourself as ready for your tournament match
\`\`\`json
{
  "event": "tournament.ready",
  "data": {
    "tournamentId": "tourney123"
  }
}
\`\`\`

---

**SERVER → CLIENT EVENTS**

- **pong** - Response to ping
\`\`\`json
{
  "event": "pong",
  "data": {
    "timestamp": 1625247600000
  }
}
\`\`\`

- **pong.customGameCreated** - Custom game was created
\`\`\`json
{
  "event": "pong.customGameCreated",
  "data": {
    "gameId": "game123",
    "otherUsername": "opponent"
  }
}
\`\`\`

- **pong.playerJoinedCustomGame** - Opponent joined your custom game
\`\`\`json
{
  "event": "pong.playerJoinedCustomGame",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.customGameJoinSuccess** - Successfully joined a custom game
\`\`\`json
{
  "event": "pong.customGameJoinSuccess",
  "data": {
    "gameId": "game123",
    "creatorUsername": "creator"
  }
}
\`\`\`

- **pong.playerReadyStatus** - Opponent's ready status changed
\`\`\`json
{
  "event": "pong.playerReadyStatus",
  "data": {
    "gameId": "game123",
    "readyStatus": true
  }
}
\`\`\`

- **pong.customGameCanceled** - Custom game was canceled
\`\`\`json
{
  "event": "pong.customGameCanceled",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.playerQuitCustomGameInLobby** - Opponent quit before game started
\`\`\`json
{
  "event": "pong.playerQuitCustomGameInLobby",
  "data": {
    "gameId": "game123"
  }
}
\`\`\`

- **pong.matchedInRandomGame** - Matched with opponent in matchmaking
\`\`\`json
{
  "event": "pong.matchedInRandomGame",
  "data": {
    "gameId": "game123",
    "opponentUsername": "opponent",
    "yourSide": "left",
    "coolDownMs": 3000
  }
}
\`\`\`

- **pong.gameStarted** - Game is starting
\`\`\`json
{
  "event": "pong.gameStarted",
  "data": {
    "gameId": "game123",
    "opponentUsername": "opponent",
    "yourSide": "left"
  }
}
\`\`\`

- **pong.gameState** - Real-time game state update (sent every 2 frames)
\`\`\`json
{
  "event": "pong.gameState",
  "data": {
    "gameId": "game123",
    "ball": {
      "x": 0.5,
      "y": 0.5,
      "vx": 3,
      "vy": 1,
      "speed": 3,
      "radius": 0.02
    },
    "paddles": {
      "playerLeft": { "x": 0.05, "y": 0.4, "width": 0.02, "height": 0.2 },
      "playerRight": { "x": 0.93, "y": 0.4, "width": 0.02, "height": 0.2 }
    },
    "scores": {
      "playerLeft": 0,
      "playerRight": 0
    }
  }
}
\`\`\`

- **pong.paddleMove** - Paddle position update
\`\`\`json
{
  "event": "pong.paddleMove",
  "data": {
    "gameId": "game123",
    "playerId": "user123",
    "paddleY": 0.4
  }
}
\`\`\`

- **pong.score** - A player scored
\`\`\`json
{
  "event": "pong.score",
  "data": {
    "gameId": "game123",
    "scorerId": "user123",
    "scores": {
      "playerLeft": 1,
      "playerRight": 0
    }
  }
}
\`\`\`

- **pong.gameEnded** - Game has ended
\`\`\`json
{
  "event": "pong.gameEnded",
  "data": {
    "gameId": "game123",
    "winner": "user123",
    "quit": false
  }
}
\`\`\`

- **pong.torunamentCreated** - Tournament has been created
\`\`\`json
{
  "event": "pong.tournamentCreated",
  "data": {
    "name": "Summer Cup",
    "tournamentId": "tourney123"
  }
}
\`\`\`

- **pong.tournamentParticipantJoined** - A new participant joined the tournament
\`\`\`json
{
  "event": "pong.tournamentParticipantJoined",
  "data": {
    "tournamentId": "tourney123",
    "tournamentName": "Summer Cup",
    "participantUsername": "newPlayer"
  }
}
\`\`\`

- **pong.tournamentParticipantLeft** - A participant left the tournament
\`\`\`json
{
  "event": "pong.tournamentParticipantLeft",
  "data": {
    "tournamentId": "tourney123",
    "tournamentName": "Summer Cup",
    "participantUsername": "leavingPlayer"
  }
}
\`\`\`

- **pong.tournamentStarted** - Tournament has started
\`\`\`json
{
  "event": "pong.tournamentStarted",
  "data": {
    "tournamentId": "tourney123",
    "tournamentName": "Summer Cup"
  }
}
\`\`\`

- **pong.tournamentRoundInfo** - Information about current tournament round and your match
\`\`\`json
{
  "event": "pong.tournamentRoundInfo",
  "data": {
    "roundNumber": 1,
    "totalMatches": 4,
    "playerMatch": {
      "id": "match123",
      "playerLeftId": "user1",
      "playerLeftUsername": "player1",
      "playerRightId": "user2",
      "playerRightUsername": "player2",
      "gameStatus": "WAITING"
    }
  }
}
\`\`\`

- **pong.tournamentRoundCooldown** - Break before next round starts
\`\`\`json
{
  "event": "pong.tournamentRoundCooldown",
  "data": {
    "cooldownMs": 5000,
    "nextRoundNumber": 2
  }
}
\`\`\`

- **pong.tournamentPlayerReady** - Your opponent is ready for the match
\`\`\`json
{
  "event": "pong.tournamentPlayerReady",
  "data": {
    "matchId": "match123",
    "readyUserId": "user2"
  }
}
\`\`\`

- **pong.tournamentMatchStarted** - Your tournament match is starting
\`\`\`json
{
  "event": "pong.tournamentMatchStarted",
  "data": {
    "gameId": "game123",
    "matchId": "match123"
  }
}
\`\`\`

- **pong.tournamentMatchEnded** - A tournament match has ended
\`\`\`json
{
  "event": "pong.tournamentMatchEnded",
  "data": {
    "matchId": "match123",
    "winnerId": "user1",
    "winnerUsername": "champion"
  }
}
\`\`\`

- **pong.tournamentEnded** - Tournament has finished
\`\`\`json
{
  "event": "pong.tournamentEnded",
  "data": {
    "tournamentId": "tourney123",
    "winnerId": "user1",
    "winnerUsername": "champion"
  }
}
\`\`\`

- **pong.tournamentCancelled** - Tournament was cancelled (e.g., creator left)
\`\`\`json
{
  "event": "pong.tournamentCancelled",
  "data": {
    "tournamentId": "tourney123"
  }
}
\`\`\`

- **pong.tournamentBracketUpdate** - Full tournament bracket state update (sent after matches end and rounds start)
\`\`\`json
{
  "event": "pong.tournamentBracketUpdate",
  "data": {
    "tournamentId": "tourney123",
    "name": "Summer Cup",
    "status": "IN_PROGRESS",
    "currentRound": 2,
    "totalRounds": 3,
    "participantCount": 8,
    "winner": null,
    "rounds": [
      {
        "roundNumber": 1,
        "matches": [
          {
            "id": "match1",
            "playerLeft": { "userId": "user1", "username": "alice" },
            "playerRight": { "userId": "user2", "username": "bob" },
            "status": "FINISHED",
            "winner": { "userId": "user1", "username": "alice" },
            "isBye": false,
            "scores": { "user1": 5, "user2": 3 }
          }
        ]
      }
    ]
  }
}
\`\`\`

- **error** - Error message
\`\`\`json
{
  "event": "error",
  "data": {
    "message": "Invalid message format"
  }
}
\`\`\`

---

**ERROR HANDLING**

- Invalid API Key: Connection refused with 401 Unauthorized
- Missing User ID: Connection closed with code 1008
- Invalid Message Format: Server sends error event
- Unknown Event Type: Server sends error event
`
	}
};


/**
 * Swagger documentation setup for Pong Service
 * Provides JSON spec only - UI is handled by the gateway aggregator
 */
export async function	setupSwagger(fastify)
{
	// Setup Swagger documentation (JSON spec only)
	await fastify.register(import('@fastify/swagger'),
	{
		swagger:
		{
			info:
			{
				title: 'Pong Service API',
				description: 'Pong microservice API with WebSocket support',
				version: '1.0.0'
			},
			host: `localhost:${process.env.PORT}`,
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			securityDefinitions:
			{
				internalApiKey:
				{
					type: 'apiKey',
					name: 'x-internal-api-key',
					in: 'header'
				},
				cookieAuth:
				{
					type: 'apiKey',
					name: 'JWT tokens',
					in: 'cookie'
				}
			}
		}
	});

	const	docsRouteOptions =
	{
		schema:
		{
			summary: '🔒 Internal (used by swagger aggregator)',
		}
	}

	// Manually register the JSON endpoint since we're not using swagger-ui
	fastify.get('/docs/json', docsRouteOptions, async (request, reply) =>
	{
		return (fastify.swagger());
	});

	// WebSocket documentation endpoint (for Swagger only - doesn't actually work as HTTP GET)
	fastify.get('/ws/docs', websocketDocumentationOpts, async (request, reply) =>
	{
		return reply.code(501).send({
			message: 'This endpoint is for documentation only. Use WebSocket protocol to connect to /ws'
		});
	});

	console.log(`[PONG] Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}