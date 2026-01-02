/**
 * WebSocket documentation for Swagger UI
 */
const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket documentation',
		description: `
Connection URL: ws://BASE_URL/tris/ws

**Authentication:**

The connection will be rejected (closed with code 1008) if JWT isn't provided in httponly cookie.

---

**CLIENT → SERVER EVENTS**

- **ping**
\`\`\`json
{
  "event": "ping",
  "data": {}
}

Reponse:
{
  "event": "pong",
  "data": {
	"timestamp": 1625247600000
  }
}
\`\`\`

- **tris.createCustomGame** - Create a custom game with another player
\`\`\`json
{
  "event": "tris.playerJoinedCustomGame",
  "data": {
    "otherId": "userId-of-invited-player"
  }
}
\`\`\`

- **tris.joinCustomGame** - Join a custom game
\`\`\`json
{
  "event": "tris.joinCustomGame",
  "data": {
	"gameId": "some-game-id"
  }
}
\`\`\`

- **tris.cancelCustomGame** - Cancel a custom game
\`\`\`json
{
  "event": "tris.cancelCustomGame",
  "data": {
	"gameId": "some-game-id"
  }
}
\`\`\`

- **tris.userQuit** - Quit a game
\`\`\`json
{
  "event": "tris.userQuit",
  "data": {
	"gameId": "some-game-id"
  }
}
\`\`\`

- **tris.userReady** - Set user ready status
\`\`\`json
{
  "event": "tris.userReady",
  "data": {
	"gameId": "some-game-id",
	"readyStatus": true
  }
}
\`\`\`

- **tris.joinMatchmaking** - Join the matchmaking queue
\`\`\`json
{
  "event": "tris.joinMatchmaking",
  "data": {}
}
\`\`\`

- **tris.leaveMatchmaking** - Leave the matchmaking queue
\`\`\`json
{
  "event": "tris.leaveMatchmaking",
  "data": {}
}
\`\`\`

- **tris.makeMove** - Make a move in the game
\`\`\`json
{
  "event": "tris.makeMove",
  "data": {
	"gameId": "some-game-id",
	"position": 0-8 0-8 for a 3x3 grid
  }
}

Reponse:
{
  "event": "invalidMove",
  "data": {
	"gameId": "some-game-id",
    "message": "Invalid move: Position already taken" / "Not your turn" / "Invalid move position"
  }
}
\`\`\`

---

**SERVER → CLIENT EVENTS**

- **tris.playerJoinedCustomGame** - Notification when a player joins a custom game
\`\`\`json
{
  "event": "tris.playerJoinedCustomGame",
  "data": {
    "gameId": "some-game-id"
  }
}
\`\`\`

- **tris.playerReadyStatus** - Notification of a player's ready status
\`\`\`json
{
  "event": "tris.playerReadyStatus",
  "data": {
	"gameId": "some-game-id",
	"readyStatus": true
  }
}
\`\`\`

- **tris.gameStarted** - Notification that the game has started
\`\`\`json
{
  "event": "tris.gameStarted",
  "data": {
	"gameId": "some-game-id"
  }
}
\`\`\`

- **tris.gameCanceled** - Notification that the game has been canceled
\`\`\`json
{
  "event": "tris.gameCanceled",
  "data": {
	"gameId": "some-game-id"
  }
}
\`\`\`

- **tris.gameEnded** - Notification that the game has ended
\`\`\`json
{
  "event": "tris.gameEnded",
  "data": {
	"gameId": "some-game-id",
	"winner": "userId-of-winner", // NOT DRAW because it's infinite tris
	"message": "You won!" // optional message
  }
}
\`\`\`

- **tris.gameStarted** - Notification that the game has started
\`\`\`json
{
  "event": "tris.gameStarted",
  "data": {
	"gameId": "some-game-id",
	"yourSymbol": "X", // or "O"
	"opponentUsername": "jack",
	"yourTurn": true // or false
  }
}
\`\`\`

- **tris.moveMade** - Notification that a move has been made
\`\`\`json
{
  "event": "tris.moveMade",
  "data": {
	"gameId": "some-game-id",
	"playerId": "userId-of-player-who-made-move",
	"position": 0-8, // position of the move made
	"removedPosition": 0-8 // position of the removed move in infinite tris, null if not applicable
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
- Missing User ID: Connection refused with 401 Unauthorized
- Invalid Message Format: Server sends error event
- Unknown Event Type: Server sends error event
`
	}
};


/**
 * Swagger documentation setup for Tris Service
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
				title: 'Tris Service API',
				description: 'Tris microservice API with WebSocket support',
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

	console.log(`[TRIS] Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}