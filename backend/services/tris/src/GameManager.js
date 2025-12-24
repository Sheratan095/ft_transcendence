import { GameInstance } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';
import { trisConnectionManager, GameStatus } from './TrisConnectionManager.js';

class	GameManager
{
	constructor()
	{
		this._games = new Map(); // gameId -> GameInstance
		this._waitingPlayers = []; // Queue of players waiting for a match
	}

	createCustomGame(creatorId, otherId)
	{
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
		const	gameInstance = new GameInstance(gameId, playerXId, playerOId);

		// Add the new game to the games map
		this._games.set(gameId, gameInstance);

		console.log(`[TRIS] Created custom game ${gameId} between ${playerXId} and ${playerOId}`);

		return (gameId);
	}

	cancelCustomGame(userId, gameId)
	{
		if (this._games.has(gameId))
		{
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

			this._games.delete(gameId);

			console.log(`[TRIS] Canceled custom game ${gameId}`);
		}
		else
			console.error(`[TRIS] Attempted to cancel non-existent game ${gameId}`);
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

		// Check if player is already in the game

		if (gameInstance)
		{
			if (gameInstance.playerOId === null)
			{
				gameInstance.playerOId = playerId;
				console.log(`[TRIS] Player ${playerId} joined custom game ${gameId}`);
			}
			else
			{
				console.error(`[TRIS] Game ${gameId} is already full`);
				trisConnectionManager.sendErrorMessage(playerId, 'Game is already full');
			}
		}
		else
		{
			console.error(`[TRIS] Game ${gameId} not found`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
		}
	}

	quitCustomGame(playerId, gameId)
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

		this._games.delete(gameId);
		console.log(`[TRIS] Player ${playerId} quit custom game ${gameId}`);

		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
			// TO DO send message to other player that the game has been quit => win
			// trisConnectionManager.sendErrorMessage(otherPlayerId, 'Your opponent has quit the game');
		}
	}
}

export const	gameManager = new GameManager();