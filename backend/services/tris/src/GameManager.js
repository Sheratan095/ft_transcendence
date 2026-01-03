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
			trisConnectionManager.sendErrorMessage(creatorId, 'Can\'t create a game while in matchmaking');
			return ;
		}

		// Can't create a game with yourself
		if (creatorId === otherId)
			trisConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with yourself');
		// Can't crate a game with a null player
		if (!otherId)
			trisConnectionManager.sendErrorMessage(creatorId, 'Invalid opponent ID');
		// Can't create a game if you created another one already
		for (const game of this._games.values())
		{
			if (game.playerXId === creatorId && game.gameStatus === GameStatus.WAITING)
			{
				trisConnectionManager.sendErrorMessage(creatorId, 'You already have a waiting game');
				return ;
			}
		}

		let	playerXId;
		let	playerOId;

		// Casually assign player X and O
		if (Math.random() < 0.5)
		{
			playerXId = creatorId;
			playerOId = otherId;
		}
		else
		{
			playerXId = otherId;
			playerOId = creatorId;
		}

		// Generate gameId and GameInstance
		const	gameId = uuidv4();
		const	gameInstance = new GameInstance(gameId, playerXId, playerOId, creatorUsername, otherUsername, GameType.CUSTOM);

		// Add the new game to the games map
		this._games.set(gameId, gameInstance);

		// Send game invite notification
		sendGameInviteNotification(creatorId, creatorUsername, otherId, gameId);

		// Reply to creator with gameId
		trisConnectionManager.sendCustomGameCreationReply(creatorId, gameId, otherUsername);

		console.log(`[TRIS] Created custom game ${gameId} between ${playerXId} and ${playerOId}`);

		return (gameId);
	}

	// Could be used also to decline an invitation
	cancelCustomGame(userId, gameId)
	{
		const	gameInstance = this._games.get(gameId);

		// Check if game exists
		if (!gameInstance)
		{
			console.error(`[TRIS] Attempted to cancel non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(userId, 'Game not found');
			return ;
		}

		// Check if the game is a custom game
		if (gameInstance.gameType !== GameType.CUSTOM)
		{
			console.error(`[TRIS] Attempted to cancel non-custom game ${gameId}`);
			trisConnectionManager.sendErrorMessage(userId, 'Cannot cancel a non-custom game');
			return ;
		}

		// Check if the requesting user is part of the game
		if (this._games.get(gameId).playerXId !== userId && this._games.get(gameId).playerOId !== userId)
		{
			console.error(`[TRIS] User ${userId} is not part of game ${gameId} and cannot cancel it`);
			trisConnectionManager.sendErrorMessage(userId, 'You are not part of this game');
			return ;
		}

		// Only allow cancellation if the game hasn't started
		if (this._games.get(gameId).gameStatus === GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] Cannot cancel game ${gameId} as it is already in progress`);
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

		// Check if game exists
		if (!gameInstance)
		{
			console.error(`[TRIS] Game ${gameId} not found`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if game is a custom game
		if (gameInstance.gameType !== GameType.CUSTOM)
		{
			console.error(`[TRIS] Game ${gameId} is not a custom game`);
			trisConnectionManager.sendErrorMessage(playerId, 'Not a custom game');
			return ;
		}

		if (gameInstance.playerXId === playerId)
		{
			console.error('[TRIS] Player cannot join their own custom game');
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot join your own game');
			return ;
		}

		// Only invitee user can join the custom game
		if (gameInstance.playerXId !== playerId)
		{
			console.error(`[TRIS] Player ${playerId} is not part of game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Notify the other player that the invited player has joined
		const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
		trisConnectionManager.sendPlayerJoinedCustomGame(otherPlayerId, gameId);

		console.log(`[TRIS] Player ${playerId} joined custom game ${gameId}`);
	}

	quitGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		// Check if game exists
		if (!gameInstance)
		{
			console.error(`[TRIS] Game ${gameId} not found`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.playerXId !== playerId && gameInstance.playerOId !== playerId)
		{
			console.error(`[TRIS] Player ${playerId} is not part of game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Check if game is in progress
		if (gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] Game ${gameId} is not in progress`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot quit a game that isn\'t started');
			return ;
		}

		// If the player quits, the other player wins
		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
			this.gameEnd(gameInstance, otherPlayerId, playerId, true);
		}
	}

	playerReady(playerId, gameId, readyStatus)
	{
		const	gameInstance = this._games.get(gameId);
		// Check if game exists
		if (!gameInstance)
		{
			console.error(`[TRIS] Game ${gameId} not found`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.playerXId !== playerId && gameInstance.playerOId !== playerId)
		{
			console.error(`[TRIS] Player ${playerId} is not part of game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
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

		console.log(`[TRIS] Game ${gameInstance.id} ended. Result: ${result}. Message: ${message}`);

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
		// Check if game exists
		if (!gameInstance)
		{
			console.error(`[TRIS] Game ${gameId} not found`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.playerXId !== playerId && gameInstance.playerOId !== playerId)
		{
			console.error(`[TRIS] Player ${playerId} is not part of game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Check if game is in progress
		if (gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
		{
			console.error(`[TRIS] Game ${gameId} is not in progress`);
			trisConnectionManager.sendErrorMessage(playerId, 'Cannot make a move in a game that isn\'t in progress');
			return ;
		}

		gameInstance.processMove(playerId, move);

		console.log(`[TRIS] Player ${playerId} made move ${move} in game ${gameId}`);
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
			}
		}
	}
}

export const	gameManager = new GameManager();