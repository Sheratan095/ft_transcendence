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
    "tournamentId": "tourney123",
    "name": "Summer Cup",
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
    "tournamentId": "tourney123"
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