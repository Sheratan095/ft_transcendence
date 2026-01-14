// Pong connection manager handles WebSocket connections and message routing
class	PongConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		console.log(`[PONG] User ${userId} connected`);
	}

	removeConnection(userId)
	{
		this._connections.delete(userId);
		console.log(`[PONG] User ${userId} disconnected`);
	}

	getConnection(userId)
	{
		return (this._connections.get(userId));
	}

	count()
	{
		return (this._connections.size);
	}

	async	sendCustomGameCreationReply(creatorId, gameId, otherUsername)
	{
		const	socket = this._connections.get(creatorId);

		const	data = {
			gameId,
			otherUsername,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.customGameCreated', data);
	}

	async	sendPlayerJoinedCustomGame(otherPlayerId, gameId)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.playerJoinedCustomGame', { gameId });
	}

	async	replyCustomGameJoined(playerId, gameId, creatorUsername)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			creatorUsername,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.customGameJoinSuccess', data);
	}

	// Other player is the one who DID NOT change their ready status
	async	sendPlayerReadyStatus(otherPlayerId, gameId, readyStatus)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.playerReadyStatus', { gameId, readyStatus });
	}

	async	sendCustomGameCanceled(playerId, gameId)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.customGameCanceled', { gameId });
	}

	async	sendPlayerQuitCustomGameInLobby(otherPlayerId, gameId)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.playerQuitCustomGameInLobby', { gameId });
	}

	async	sendGameEnded(playerId, gameId, winner, winnerUsername, quit)
	{
		const	socket = this._connections.get(playerId);

		const	data =
		{
			gameId: gameId,
			winnerId: winner,
			winnerUsername: winnerUsername,
			quit: quit,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.gameEnded', data);
	}

	async	sendGameState(playerId, gameStateData)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.gameState', gameStateData);
	}

	async	sendPaddleMove(playerId, paddleMoveData)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.paddleMove', paddleMoveData);
	}

	async	sendScore(playerId, scoreData)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.score', scoreData);
	}

	async	notifyMatchedInRandomGame(playerId, gameId, opponentUsername, side)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			opponentUsername,
			"yourSide": side,
			coolDownMs: process.env.COOLDOWN_MS
		}

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.matchedInRandomGame', data);
	}

	async	notifyGameStart(playerId, gameId, side, opponentUsername)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			opponentUsername,
			"yourSide": side,
		}

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.gameStarted', data);
	}

	// Used to notify both players of a move made
	async	sendMoveMade(playerId, moveMakerId, gameId, symbol, position, removedPosition = null)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			playerId: moveMakerId,
			symbol,
			position,
			removedPosition,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.moveMade', data);
	}

	async	sendInvalidMoveMessage(playerId, gameId, message)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.invalidMove', { gameId, message });
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
	}

	#dispatchEventToSocket(socket, event, data)
	{
		if (socket)
		{
			try
			{
				socket.send(JSON.stringify({ event, data }));
			}
			catch (e)
			{
				console.error(`[PONG] Failed to send ${event}:`, e.message);
			}
		}
	}

}

export const	pongConnectionManager = new PongConnectionManager();
