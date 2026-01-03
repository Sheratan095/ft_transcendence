// Chat connection manager handles WebSocket connections and message routing
class	TrisConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		console.log(`[TRIS] User ${userId} connected`);
	}

	removeConnection(userId)
	{
		// TO DO remove all waiting games associated with this user
		this._connections.delete(userId);
		console.log(`[TRIS] User ${userId} disconnected`);
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
			this.#dispatchEventToSocket(socket, 'tris.customGameCreated', data);
	}

	async	sendPlayerJoinedCustomGame(otherPlayerId, gameId)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.playerJoinedCustomGame', { gameId });
	}

	// Other player is the one who DID NOT change their ready status
	async	sendPlayerReadyStatus(otherPlayerId, gameId, readyStatus)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.playerReadyStatus', { gameId, readyStatus });
	}

	async	sendGameCanceled(playerId, gameId)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.gameCanceled', { gameId });
	}

	async	sendGameEnded(playerId, gameId, winner, message)
	{
		const	socket = this._connections.get(playerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.gameEnded', { gameId, winner, message });
	}

	async	notifyGameStart(playerId, gameId, symbol, opponentUsername, yourTurn = false)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			yourSymbol: symbol,
			opponentUsername,
			yourTurn,
		}

		if (socket)
			this.#dispatchEventToSocket(socket, 'tris.gameStarted', data);
	}

	// Used to notify both players of a move made
	async	sendMoveMade(playerId, gameId, position, removedPosition = null)
	{
		const	socket = this._connections.get(playerId);

		const	data = {
			gameId,
			playerId, // player who made the move
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
				console.error(`[TRIS] Failed to send ${event}:`, e.message);
			}
		}
	}

}

export const	trisConnectionManager = new TrisConnectionManager();
