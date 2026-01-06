import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';
import { trisConnectionManager } from './TrisConnectionManager.js';
import { sendGameInviteNotification } from './tris-help.js';

class	GameManager
{
	constructor()
	{
		this._games = new Map(); // gameId -> GameInstance
		this._waitingPlayers = []; // Queue of players waiting for a match
	}

	createCustomGame(creatorId, creatorUsername, otherId, otherUsername)
	{
		// Can't create a game with yourself
		if (creatorId === otherId)
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with themselves`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with yourself');
			return ;
		}

		// Can't create a game with a null player
		if (!otherId)
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with invalid opponent (${otherId})`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Invalid opponent ID');
			return ;
		}

		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(creatorId))
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game while busy`);
			trisConnectionManager.sendErrorMessage(creatorId, 'You are already in a game or matchmaking');
			return ;
		}

		// Generate gameId and GameInstance
		const	gameId = uuidv4();
		// X is always the creator
		const	gameInstance = new GameInstance(gameId, creatorId, otherId, creatorUsername, otherUsername, GameType.CUSTOM);

		// Add the new game to the games map
		this._games.set(gameId, gameInstance);

		// Send game invite notification
		sendGameInviteNotification(creatorId, creatorUsername, otherId, gameId);

		// Reply to creator with gameId
		trisConnectionManager.sendCustomGameCreationReply(creatorId, gameId, otherUsername);

		console.log(`[TRIS] ${creatorId} created custom game ${gameId} with ${otherId}`);

		return (gameId);
	}

	// Could be used also to decline an invitation
	cancelCustomGame(userId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${userId} tried to cancel non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(userId, 'Game not found');
			return ;
		}

		// Check if the game is a custom game
		if (gameInstance.gameType !== GameType.CUSTOM)
		{
			console.error(`[TRIS] ${userId} attempted to cancel non-custom game ${gameId}`);
			trisConnectionManager.sendErrorMessage(userId, 'Cannot cancel a non-custom game');
			return ;
		}

		// Check if the requesting user is part of the game
		if (gameInstance.hasPlayer(userId) === false)
		{
			console.error(`[TRIS] ${userId} tried to cancel game ${gameId} they are not part of`);
			trisConnectionManager.sendErrorMessage(userId, 'You are not part of this game');
			return ;
		}

		if (gameInstance.playerXId !== userId)
		{
			console.error(`[TRIS] ${userId} tried to cancel game ${gameId} but is not the creator`);
			trisConnectionManager.sendErrorMessage(userId, 'Only the game creator can cancel the game');
			return ;
		}

		// Only allow cancellation if the game hasn't started yet
		if (this._games.get(gameId).gameStatus === GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] ${userId} tried to cancel game ${gameId} which is already in progress`);
			trisConnectionManager.sendErrorMessage(userId, 'Cannot cancel game in progress');
			return ;
		}

		// Notify players that the game has been canceled
		trisConnectionManager.sendCustomGameCanceled(gameInstance.playerXId, gameId);
		trisConnectionManager.sendCustomGameCanceled(gameInstance.playerOId, gameId);

		this._games.delete(gameId);

		console.log(`[TRIS] Canceled custom game ${gameId} by user ${userId}`);
	}

	joinCustomGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${playerId} tried to join a non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if game is a custom game and in WAITING status
		if (gameInstance.gameType !== GameType.CUSTOM && gameInstance.gameStatus === GameStatus.WAITING)
		{
			console.error(`[TRIS] ${playerId} tried to join a non-custom game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Not a custom game');
			return ;
		}

		// Check if player is the creator
		if (gameInstance.playerXId === playerId)
		{
			console.error(`[TRIS] Player ${playerId} cannot join their own custom game (created by ${gameInstance.playerXId})`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot join your own game');
			return ;
		}

		// Only invitee user can join the custom game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[TRIS] ${playerId} tried to join a game ${gameId} they are not part of`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(playerId))
		{
			console.error(`[TRIS] ${playerId} tried to join custom game ${gameId} while busy`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		// Notify the other player that the invited player has joined
		const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
		trisConnectionManager.sendPlayerJoinedCustomGame(otherPlayerId, gameId);

		// Reply to joining player with gameId and creatorUsername (X player)
		trisConnectionManager.replyCustomGameJoined(playerId, gameId, gameInstance.playerXUsername);

		// Both players are now in the lobby, waiting to ready up
		gameInstance.gameStatus = GameStatus.IN_LOBBY;

		console.log(`[TRIS] Player ${playerId} joined custom game ${gameId} created by ${gameInstance.playerXId}`);
	}

	//	for ANY IN_PROGRESS games, the other player wins
	//	for CUSTOM GAMES in WAITING status, only the creator is present and must cancel it
	//	for CUSTOM GAMES in LOBBY status, quitting cancels the game for both players
	quitGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${playerId} tried to quit non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[TRIS] ${playerId} tried to quit game ${gameId} they are not part of`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Can't quit a game in waiting status, in this case just the owner is present and must cancel it
		if (gameInstance.gameStatus === GameStatus.WAITING)
		{
			console.error(`[TRIS] ${playerId} tried to quit game ${gameId} which is still waiting for an opponent`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot quit a game that hasn\'t started yet');
			return ;
		}

		// If the match is IN_PROGRESS (started), the other player wins
		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
			this._gameEnd(gameInstance, otherPlayerId, playerId, true);
		}
		else if (gameInstance.gameStatus === GameStatus.IN_LOBBY && gameInstance.gameType === GameType.CUSTOM)
		{
			// If the match is in LOBBY and is a CUSTOM game, quitting cancels the game for both players
			console.log(`[TRIS] Player ${playerId} quit game custom game ${gameId}, game is canceled`);

			const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
			trisConnectionManager.sendPlayerQuitCustomGameInLobby(otherPlayerId, gameId);

			// Remove the game from the active games map
			this._games.delete(gameId);
		}
	}

	joinMatchmaking(playerId)
	{
		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(playerId))
		{
			console.error(`[TRIS] ${playerId} tried to join matchmaking while busy`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		// Add player to waiting queue
		this._waitingPlayers.push(playerId);
		console.log(`[TRIS] Player ${playerId} joined matchmaking queue`);

		// TO DO automatically match players when enough are waiting
	}

	leaveMatchmaking(playerId)
	{
		const	index = this._waitingPlayers.indexOf(playerId);
		if (index === -1)
		{
			console.error(`[TRIS] ${playerId} is not in the matchmaking queue`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not in the matchmaking queue');
			return ;
		}

		// Remove player from waiting queue
		this._waitingPlayers.splice(index, 1);
		console.log(`[TRIS] Player ${playerId} left matchmaking queue`);
	}

	playerReady(playerId, gameId, readyStatus)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${playerId} tried to change ready status in non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[TRIS] ${playerId} tried to change ready status in game ${gameId} they are not part of`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Check if game is in waiting status or in lobby (other user joined), so if the game hasn't started yet
		if (gameInstance.gameStatus !== GameStatus.WAITING && gameInstance.gameStatus !== GameStatus.IN_LOBBY)
		{
			console.error(`[TRIS] ${playerId} tried to change ready status in game ${gameId} that has already started`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot change ready status in a game that has already started');
			return ;
		}

		// Change the ready status of the player
		let	otherPlayerId;
		if (playerId === gameInstance.playerXId)
		{
			gameInstance.playerXReady = readyStatus;
			otherPlayerId = gameInstance.playerOId;
		}
		else if (playerId === gameInstance.playerOId)
		{
			gameInstance.playerOReady = readyStatus;
			otherPlayerId = gameInstance.playerXId;
		}

		// Notify other player of ready status change
		trisConnectionManager.sendPlayerReadyStatus(otherPlayerId, gameId, readyStatus);

		// If both players are ready, start the game
		if (gameInstance.playerXReady && gameInstance.playerOReady)
			this._gameStart(gameInstance);
	}

	makeMove(playerId, gameId, move)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${playerId} tried to make a move in non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[TRIS] ${playerId} tried to make a move in game ${gameId} they are not part of`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Check if game is in progress
		if (gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] ${playerId} tried to make a move in game ${gameId} which is not in progress`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot make a move in a game that isn\'t in progress');
			return ;
		}

		const	result = gameInstance.processMove(playerId, move);
		if (result && result.winner && result.loser)
			this._gameEnd(gameInstance, result.winner, result.loser, false);
	}

	handleUserDisconnect(userId)
	{
		// Remove user from matchmaking queue if present
		const	index = this._waitingPlayers.indexOf(userId);
		if (index !== -1)
		{
			this._waitingPlayers.splice(index, 1);
			console.log(`[TRIS] Removed user ${userId} from matchmaking queue due to disconnection`);
		}

		// Check if user is in any active games
		for (const gameInstance of this._games.values())
		{
			if (gameInstance.hasPlayer(userId))
			{
				// If the game is in progress, the other player wins
				if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
				{
					const	otherPlayerId = (gameInstance.playerXId === userId) ? gameInstance.playerOId : gameInstance.playerXId;
					this._gameEnd(gameInstance, otherPlayerId, userId, true);
				}
				else
				{
					// If the game hasn't started yet, just cancel it
					this.cancelCustomGame(userId, gameInstance.id);
				}
			}
		}
	}

	_gameStart(gameInstance)
	{
		console.log(`[TRIS] Starting game ${gameInstance.id} between ${gameInstance.playerXId} and ${gameInstance.playerOId}`);

		// Update game status
		gameInstance.startGame();

		// Notify both players that the game has started
		trisConnectionManager.notifyGameStart(gameInstance.playerXId, gameInstance.id, 'X', gameInstance.playerOUsername, true);
		trisConnectionManager.notifyGameStart(gameInstance.playerOId, gameInstance.id, 'O', gameInstance.playerXUsername, false);
	}

	// TO DO calculate the loser here and not everywhere it's called
	_gameEnd(gameInstance, winner, loser, quit = false)
	{
		// Notify both players that the game has ended, not incluging message, it will included handled client-side
		trisConnectionManager.sendGameEnded(gameInstance.playerXId, gameInstance.id, winner, quit);
		trisConnectionManager.sendGameEnded(gameInstance.playerOId, gameInstance.id, winner, quit);

		if (gameInstance.gameType === GameType.RANDOM)
		{
			// TO DO update user stats
		}

		// Remove the game from the active games map
		this._games.delete(gameInstance.id);

		const	result = quit ? `${loser} QUIT` : `WINNER: ${winner}`;

		console.log(`[TRIS] Game ${gameInstance.id} ended. Result: ${result}`);

	}

	// A user is considered busy if they are in matchmaking
	//	or in a game that is in progress or in lobby (waiting for ready)
	_isUserBusy(userId)
	{
		if (this._waitingPlayers.includes(userId))
			return (true);

		// Check if user is in any active games
		for (const gameInstance of this._games.values())
		{
			if (gameInstance.hasPlayer(userId) && (gameInstance.gameStatus === GameStatus.IN_PROGRESS || gameInstance.gameStatus === GameStatus.IN_LOBBY))
				return (true);
		}

		return (false);
	}
}

export const	gameManager = new GameManager();