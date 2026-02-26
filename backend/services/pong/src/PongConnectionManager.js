import { tournamentManager } from './TournamentManager.js';
import { gameManager } from './GameManager.js';

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
		tournamentManager.handleUserDisconnect(userId);
		gameManager.handleUserDisconnect(userId);
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
			opponentUsername: otherUsername,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.customGameCreated', data);
	}

	async	sendPlayerJoinedCustomGame(otherPlayerId, gameId, joiningPlayerUsername)
	{
		const	socket = this._connections.get(otherPlayerId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.playerJoinedCustomGame', { gameId, joiningPlayerUsername });
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

	// Send ready status to both players with information about which player changed
	async	sendPlayerReadyStatusBoth(playerId, otherPlayerId, gameId, readyStatus, playerSide)
	{
		const data = { gameId, readyStatus, playerSide };
		
		// Send to the player who just changed their ready status
		const socket1 = this._connections.get(playerId);
		if (socket1)
			this.#dispatchEventToSocket(socket1, 'pong.playerReadyStatus', data);
		
		// Send to the other player
		const socket2 = this._connections.get(otherPlayerId);
		if (socket2)
			this.#dispatchEventToSocket(socket2, 'pong.playerReadyStatus', data);
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
			winner: winner,
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
			coolDownMs: process.env.READY_COOLDOWN_MS
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

	// ------------ TOURNAMENT RELATED MESSAGES ------------

	async	replyTournamentCreated(creatorId, torunamentName, tournamentId)
	{
		const	socket = this._connections.get(creatorId);

		const	data = {
			"name": torunamentName,
			tournamentId,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentCreated', data);
	}

	async	notifyTournamentParticipantJoined(participantId, newUserId, newUsername, tournamentName, tournamentId)
	{
		const	socket = this._connections.get(participantId);

		const	data = {
			tournamentId,
			tournamentName,
			player: { id: newUserId, username: newUsername },
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentParticipantJoined', data);
	}

	async	notifyTournamentParticipantLeft(participantId, leavingUserId, leavingUsername, tournamentName, tournamentId)
	{
		const	socket = this._connections.get(participantId);

		const	data = {
			tournamentId,
			tournamentName,
			player: { id: leavingUserId, username: leavingUsername },
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentParticipantLeft', data);
	}

	async	notifyTournamentStarted(participantId, tournamentName, tournamentId)
	{
		const	socket = this._connections.get(participantId);

		const	data = {
			tournamentId,
			tournamentName,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentStarted', data);
	}

	async	sendTournamentRoundInfo(participantId, playerLeftId, playerLeftUsername, playerRightId, playerRightUsername, matchId)
	{
		const	socket = this._connections.get(participantId);

		const	data = {
			matchId,
			playerLeftId,
			playerLeftUsername,
			playerRightId,
			playerRightUsername,
			yourSide: participantId === playerLeftId ? 'left' : 'right',
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentRoundInfo', data);
	}

	async	notifyTournamentRoundCooldown(participantId, cooldownMs, nextRoundNumber)
	{
		const	socket = this._connections.get(participantId);

		const	data = {
			cooldownMs,
			nextRoundNumber,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentRoundCooldown', data);
	}

	async	notifyTournamentPlayerReady(userId, readyUserId, matchId)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			matchId,
			readyUserId,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentPlayerReady', data);
	}

	async	sendTournamentMatchStarted(userId, gameId, matchId, opponentUsername, yourSide)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			gameId,
			matchId,
			opponentUsername,
			yourSide,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentMatchStarted', data);
	}

	async	notifyTournamentMatchEnded(userId, matchId, winnerId, winnerUsername)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			matchId,
			winnerId,
			winnerUsername,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentMatchEnded', data);
	}

	async	notifyTournamentEnded(userId, tournamentId, winnerId, winnerUsername)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			tournamentId,
			winnerId,
			winnerUsername,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentEnded', data);
	}

	async	notifyTournamentCancelled(userId, tournamentId)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			tournamentId,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentCancelled', data);
	}

	async	sendTournamentBracketUpdate(userId, bracket)
	{
		const	socket = this._connections.get(userId);

		if (socket)
			this.#dispatchEventToSocket(socket, 'pong.tournamentBracketUpdate', bracket);
	}

	//------------------------------------------

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
