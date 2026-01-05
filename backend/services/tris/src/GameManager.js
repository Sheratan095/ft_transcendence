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
		if (this._waitingPlayers.includes(creatorId))
		{
			console.error(`[TRIS] ${creatorId} cannot create custom game while in matchmaking`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Can\'t create a game while in matchmaking');
			return ;
		}

		// Can't create a game with yourself
		if (creatorId === otherId)
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with themselves`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with yourself');
			return ;
		}
		// Can't crate a game with a null player
		if (!otherId)
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with invalid opponent (${otherId})`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Invalid opponent ID');
			return ;
		}
		// Can't create a game if you created another one already
		for (const game of this._games.values())
		{
			if (game.playerXId === creatorId && game.gameStatus === GameStatus.WAITING)
			{
				console.error('[TRIS] Cannot create multiple custom games simultaneously');
				trisConnectionManager.sendErrorMessage(creatorId, 'You already have a waiting game');
				return ;
			}
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

		console.log(`[TRIS] ${playerXId} created custom game ${gameId} with ${playerOId}`);

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

		// Only allow cancellation if the game hasn't started
		if (this._games.get(gameId).gameStatus === GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] ${userId} tried to cancel game ${gameId} which is already in progress`);
			trisConnectionManager.sendErrorMessage(userId, 'Cannot cancel game in progress');
			return ;
		}

		// Notify players that the game has been canceled
		trisConnectionManager.sendGameCanceled(gameInstance.playerXId, gameId);
		trisConnectionManager.sendGameCanceled(gameInstance.playerOId, gameId);

		this._games.delete(gameId);

		console.log(`[TRIS] Canceled custom game ${gameId} by user ${userId}`);
	}

	joinCustomGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`${playerId} tried to join a non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if game is a custom game
		if (gameInstance.gameType !== GameType.CUSTOM)
		{
			console.error(`${playerId} tried to join a non-custom game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Not a custom game');
			return ;
		}

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

		if (this._waitingPlayers.includes(playerId))
		{
			console.error(`[TRIS] ${playerId} tried to join a custom game while in matchmaking`);
			trisConnectionManager.sendErrorMessage(playerId, 'Can\'t join a game while in matchmaking');
			return ;
		}

		// Notify the other player that the invited player has joined
		const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
		trisConnectionManager.sendPlayerJoinedCustomGame(otherPlayerId, gameId);

		// Reply to joining player with gameId and creatorUsername (X player)
		trisConnectionManager.replyCustomGameJoined(playerId, gameId, gameInstance.playerXUsername);

		console.log(`[TRIS] Player ${playerId} joined custom game ${gameId} created by ${gameInstance.playerXId}`);
	}

	// TO DO check disconnection
	quitGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`${playerId} tried to quit non-existent game ${gameId}`);
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

		// Check if game is in progress
		if (gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] ${playerId} tried to quit game ${gameId} which is not in progress`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot quit a game that isn\'t started');
			return ;
		}

		// If the player quits, the other player wins
		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
			this.gameEnd(gameInstance, otherPlayerId, playerId, true);
		}
		else
		{
			// TO DO
		}
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

		if (gameInstance.gameStatus !== GameStatus.WAITING)
		{
			console.error(`[TRIS] ${playerId} tried to change ready status in game ${gameId} which is not in waiting status`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot change ready status in a game that has already started');
			return ;
		}

		// Change the ready status of the player
		let	otherPlayerId;
		if (playerId === gameInstance.playerXId)
		{
			gameInstance.playerXIdReady = readyStatus;
			otherPlayerId = gameInstance.playerOId;
		}
		else if (playerId === gameInstance.playerOId)
		{
			gameInstance.playerOIdReady = readyStatus;
			otherPlayerId = gameInstance.playerXId;
		}

		// Notify other player of ready status change
		trisConnectionManager.sendPlayerReadyStatus(otherPlayerId, gameId, readyStatus);

		// If both players are ready, start the game
		if (gameInstance.playerXIdReady && gameInstance.playerOIdReady)
			this.gameStart(gameInstance);
	}

	gameEnd(gameInstance, winner, loser, quit = false)
	{
		// Notify both players that the game has ended
		trisConnectionManager.sendGameEnded(gameInstance.playerXId, gameInstance.id, winner, quit ? 'Your opponent has quit the game' : 'You won!');
		trisConnectionManager.sendGameEnded(gameInstance.playerOId, gameInstance.id, loser, quit ? 'You have quit the game' : 'You lost!');

		if (gameInstance.gameType === GameType.RANDOM)
		{
			// TO DO update user stats
		}

		// Remove the game from the active games map
		this._games.delete(gameInstance.id);

		const	result = quit ? `${loser} QUIT` : `WINNER: ${winner}`;

		console.log(`[TRIS] Game ${gameInstance.id} ended. Result: ${result}`);

	}

	gameStart(gameInstance)
	{
		console.log(`[TRIS] Starting game ${gameInstance.id} between ${gameInstance.playerXId} and ${gameInstance.playerOId}`);

		// Update game status
		gameInstance.startGame();

		// Notify both players that the game has started
		trisConnectionManager.notifyGameStart(gameInstance.playerXId, gameInstance.id, 'X', gameInstance.playerOUsername, true);
		trisConnectionManager.notifyGameStart(gameInstance.playerOId, gameInstance.id, 'O', gameInstance.playerXUsername, false);
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

		gameInstance.processMove(playerId, move);
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
					this.gameEnd(gameInstance, otherPlayerId, userId, true);
				}
				else
				{
					// If the game hasn't started yet, just cancel it
					this.cancelCustomGame(userId, gameInstance.id);
				}
			}
		}
	}
}

export const	gameManager = new GameManager();