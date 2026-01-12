import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';
import { pongConnectionManager } from './pongConnectionManager.js';
import { sendGameInviteNotification, getUsernameById, sleep } from './pong-help.js';
import { pongDatabase as pongDb } from './pong.js';

class	GameManager
{
	constructor()
	{
		this._games = new Map(); // gameId -> GameInstance
		this._waitingPlayers = []; // Queue of players waiting for a match
		this._randomGameCooldowns = new Map(); // gameId -> timeoutId used to start the game after cooldown
	}

	createCustomGame(creatorId, creatorUsername, otherId, otherUsername)
	{
		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(creatorId))
		{
			console.error(`[PONG] ${creatorId} tried to create a custom game while busy`);
			pongConnectionManager.sendErrorMessage(creatorId, 'You are already in a game or matchmaking');
			return ;
		}

		// Can't create a game with yourself
		if (creatorId === otherId)
		{
			console.error(`[PONG] ${creatorId} tried to create a custom game with themselves`);
			pongConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with yourself');
			return ;
		}

		// Can't create a game with a null player
		if (!otherId)
		{
			console.error(`[PONG] ${creatorId} tried to create a custom game with invalid opponent (${otherId})`);
			pongConnectionManager.sendErrorMessage(creatorId, 'Invalid opponent ID');
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
		pongConnectionManager.sendCustomGameCreationReply(creatorId, gameId, otherUsername);

		console.log(`[PONG] ${creatorId} created custom game ${gameId} with ${otherId}`);

		return (gameId);
	}

	// Could be used also to decline an invitation, actually isn't
	cancelCustomGame(userId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[PONG] ${userId} tried to cancel non-existent game ${gameId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Game not found');
			return ;
		}

		// Check if the game is a custom game
		if (gameInstance.gameType !== GameType.CUSTOM)
		{
			console.error(`[PONG] ${userId} attempted to cancel non-custom game ${gameId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Cannot cancel a non-custom game');
			return ;
		}

		// Check if the requesting user is part of the game
		if (gameInstance.hasPlayer(userId) === false)
		{
			console.error(`[PONG] ${userId} tried to cancel game ${gameId} they are not part of`);
			pongConnectionManager.sendErrorMessage(userId, 'You are not part of this game');
			return ;
		}

		if (gameInstance.playerLeftId !== userId)
		{
			console.error(`[PONG] ${userId} tried to cancel game ${gameId} but is not the creator`);
			pongConnectionManager.sendErrorMessage(userId, 'Only the game creator can cancel the game');
			return ;
		}

		// Only allow cancellation if the game hasn't started yet
		if (this._games.get(gameId).gameStatus === GameStatus.IN_PROGRESS)
		{
			console.error(`[PONG] ${userId} tried to cancel game ${gameId} which is already in progress`);
			pongConnectionManager.sendErrorMessage(userId, 'Cannot cancel game in progress');
			return ;
		}

		// Notify players that the game has been canceled
		pongConnectionManager.sendCustomGameCanceled(gameInstance.playerLeftId, gameId);
		pongConnectionManager.sendCustomGameCanceled(gameInstance.playerRightId, gameId);

		this._games.delete(gameId);

		console.log(`[PONG] Canceled custom game ${gameId} by user ${userId}`);
	}

	joinCustomGame(playerId, gameId)
	{
		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(playerId))
		{
			console.error(`[PONG] ${playerId} tried to join custom game ${gameId} while busy`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[PONG] ${playerId} tried to join a non-existent game ${gameId}`);
			pongConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if game is a custom game and in WAITING status
		if (gameInstance.gameType !== GameType.CUSTOM && gameInstance.gameStatus === GameStatus.WAITING)
		{
			console.error(`[PONG] ${playerId} tried to join a non-custom game ${gameId}`);
			pongConnectionManager.sendErrorMessage(playerId, 'Not a custom game');
			return ;
		}

		// Check if player is the creator
		if (gameInstance.playerLeftId === playerId)
		{
			console.error(`[PONG] Player ${playerId} cannot join their own custom game (created by ${gameInstance.playerLeftId})`);
			pongConnectionManager.sendErrorMessage(playerId, 'Cannot join your own game');
			return ;
		}

		// Only invitee user can join the custom game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[PONG] ${playerId} tried to join a game ${gameId} they are not part of`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Notify the other player that the invited player has joined
		const	otherPlayerId = (gameInstance.playerLeftId === playerId) ? gameInstance.playerRightId : gameInstance.playerLeftId;
		pongConnectionManager.sendPlayerJoinedCustomGame(otherPlayerId, gameId);

		// Reply to joining player with gameId and creatorUsername (X player)
		pongConnectionManager.replyCustomGameJoined(playerId, gameId, gameInstance.playerLeftUsername);
		// Both players are now in the lobby, waiting to ready up
		gameInstance.gameStatus = GameStatus.IN_LOBBY;

		console.log(`[PONG] Player ${playerId} joined custom game ${gameId} created by ${gameInstance.playerLeftId}`);
	}

	//	for ANY IN_PROGRESS games, the other player wins
	//	for CUSTOM GAMES in WAITING status, only the creator is present and must cancel it
	//	for CUSTOM GAMES in LOBBY status, quitting cancels the game for both players
	quitGame(playerId, gameId)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[PONG] ${playerId} tried to quit non-existent game ${gameId}`);
			pongConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[PONG] ${playerId} tried to quit game ${gameId} they are not part of`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Can't quit a game in waiting status, in this case just the owner is present and must cancel it
		if (gameInstance.gameStatus === GameStatus.WAITING)
		{
			console.error(`[PONG] ${playerId} tried to quit game ${gameId} which is still waiting for an opponent`);
			pongConnectionManager.sendErrorMessage(playerId, 'Cannot quit a game that hasn\'t started yet');
			return ;
		}

		const	otherPlayerId = (gameInstance.playerLeftId === playerId) ? gameInstance.playerRightId : gameInstance.playerLeftId;
		// If the match is IN_PROGRESS (started), the other player wins
		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			this._gameEnd(gameInstance, otherPlayerId, playerId, true, false);
		}
		else if (gameInstance.gameStatus === GameStatus.IN_LOBBY && gameInstance.gameType === GameType.CUSTOM)
		{
			// If the match is in LOBBY and is a CUSTOM game, quitting cancels the game for both players
			console.log(`[PONG] Player ${playerId} quit game custom game ${gameId}, game is canceled`);

			pongConnectionManager.sendPlayerQuitCustomGameInLobby(otherPlayerId, gameId);

			// Remove the game from the active games map
			this._games.delete(gameId);
		}
		else if (gameInstance.gameStatus === GameStatus.IN_LOBBY && gameInstance.gameType === GameType.RANDOM)
		{
			// If the match is in LOBBY and is a RANDOM game, quitting gives victory to the other player
			console.log(`[PONG] Player ${playerId} quit game random game ${gameId}, game is canceled`);

			this._gameEnd(gameInstance, otherPlayerId, playerId, true, false);
		}
	}

	joinMatchmaking(playerId)
	{
		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(playerId))
		{
			console.error(`[PONG] ${playerId} tried to join matchmaking while busy`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		// Add player to waiting queue
		this._waitingPlayers.push(playerId);
		console.log(`[PONG] Player ${playerId} joined matchmaking queue`);

		// Try to create a random game
		this._createRandomGameIfPossible();
	}

	leaveMatchmaking(playerId)
	{
		const	index = this._waitingPlayers.indexOf(playerId);
		if (index === -1)
		{
			console.error(`[PONG] ${playerId} is not in the matchmaking queue`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are not in the matchmaking queue');
			return ;
		}

		// Remove player from waiting queue
		this._waitingPlayers.splice(index, 1);
		console.log(`[PONG] Player ${playerId} left matchmaking queue`);
	}

	playerReady(playerId, gameId, readyStatus)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[PONG] ${playerId} tried to change ready status in non-existent game ${gameId}`);
			pongConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if player is part of the game
		if (gameInstance.hasPlayer(playerId) === false)
		{
			console.error(`[PONG] ${playerId} tried to change ready status in game ${gameId} they are not part of`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return ;
		}

		// Check if game is in waiting status or in lobby (other user joined), so if the game hasn't started yet
		// WAITING status is possible only for CUSTOM GAMES
		if (gameInstance.gameStatus !== GameStatus.WAITING && gameInstance.gameStatus !== GameStatus.IN_LOBBY)
		{
			console.error(`[PONG] ${playerId} tried to change ready status in game ${gameId} that has already started`);
			pongConnectionManager.sendErrorMessage(playerId, 'Cannot change ready status in a game that has already started');
			return ;
		}

		// Change the ready status of the player
		let	otherPlayerId;
		if (playerId === gameInstance.playerLeftId)
		{
			gameInstance.playerLeftReady = readyStatus;
			otherPlayerId = gameInstance.playerRightId;
		}
		else if (playerId === gameInstance.playerRightId)
		{
			gameInstance.playerRightReady = readyStatus;
			otherPlayerId = gameInstance.playerLeftId;
		}

		// Notify other player of ready status change
		pongConnectionManager.sendPlayerReadyStatus(otherPlayerId, gameId, readyStatus);

		// If both players are ready, start the game
		if (gameInstance.playerLeftReady && gameInstance.playerRightReady)
			this._gameStart(gameInstance);
	}

	makeMove(playerId, gameId, direction)
	{
	}

	handleUserDisconnect(userId)
	{
		// Remove user from matchmaking queue if present
		const	index = this._waitingPlayers.indexOf(userId);
		if (index !== -1)
		{
			this._waitingPlayers.splice(index, 1);
			console.log(`[PONG] Removed user ${userId} from matchmaking queue due to disconnection`);
		}

		// Check if user is in any active games
		for (const gameInstance of this._games.values())
		{
			if (gameInstance.hasPlayer(userId))
				this.quitGame(userId, gameInstance.id);
		}
	}

	async _createRandomGameIfPossible()
	{
		// Slight delay to allow user to leave matchmaking immediately after joining
		// This prevents instant matches that the user didn't want
		await sleep(1000);

		if (this._waitingPlayers.length < 2)
			return ;

		const	player1Id = this._waitingPlayers.shift();
		const	player2Id = this._waitingPlayers.shift();

		let	playerX;
		let	playerO;
		let	playerOUsername;
		let	playerXUsername;

		// Randomly assign X and O
		if (Math.random() < 0.5)
		{
			playerX = player1Id;
			playerXUsername = getUsernameById(playerX);
			playerO = player2Id;
			playerOUsername = getUsernameById(playerO);
		}
		else
		{
			playerX = player2Id;
			playerXUsername = getUsernameById(playerX);
			playerO = player1Id;
			playerOUsername = getUsernameById(playerO);
		}

		// Generate gameId and GameInstance
		const	gameId = uuidv4();
		const	gameInstance = new GameInstance(gameId, playerX, playerO, playerXUsername, playerOUsername, GameType.RANDOM);

		this._games.set(gameId, gameInstance);

		// Notify both players that they have been matched
		pongConnectionManager.notifyMatchedInRandomGame(playerX, gameId, 'X', playerOUsername, true); // X ALWAYS STARTS FIRST
		pongConnectionManager.notifyMatchedInRandomGame(playerO, gameId, 'O', playerXUsername, false);

		console.log(`[PONG] Matched players ${playerX} and ${playerO} in random game ${gameId}`);

		// Start cooldown timer before starting the game
		const	timerId = setTimeout(() =>
		{
			const	gameInstance = this._games.get(gameId);

			if (gameInstance && gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
			{
				console.log(`[PONG] Cooldown for game ${gameId} ended, starting game automatically`);
				this._gameStart(gameInstance); // Start the game automatically after cooldown
			}
		}, process.env.COOLDOWN_MS || 30000); // Default cooldown is 30 seconds

		this._randomGameCooldowns.set(gameId, timerId);
	}

	_gameStart(gameInstance)
	{
		console.log(`[PONG] Starting game ${gameInstance.id} between ${gameInstance.playerLeftId} and ${gameInstance.playerRightId}`);

		// Clear cooldown timer if present
		if (this._randomGameCooldowns.has(gameInstance.id))
		{
			clearTimeout(this._randomGameCooldowns.get(gameInstance.id));
			this._randomGameCooldowns.delete(gameInstance.id);
		}

		// Update game status
		gameInstance.startGame();

		// Notify both players that the game has started
		pongConnectionManager.notifyGameStart(gameInstance.playerLeftId, gameInstance.id, 'X', gameInstance.playerOUsername, true);
		pongConnectionManager.notifyGameStart(gameInstance.playerRightId, gameInstance.id, 'O', gameInstance.playerXUsername, false);

		// Start move timeout for the next player
		this._startMoveTimeout(gameInstance.id);
	}

	// Both user must be specified by input, can't be calculated from gameInstance because winner and loser depends on quit
	_gameEnd(gameInstance, winner, loser, quit, timedOut)
	{
		// Notify both players that the game has ended, not incluging message, it will included handled client-side
		pongConnectionManager.sendGameEnded(gameInstance.playerLeftId, gameInstance.id, winner, quit, timedOut);
		pongConnectionManager.sendGameEnded(gameInstance.playerRightId, gameInstance.id, winner, quit, timedOut);

		if (gameInstance.gameType === GameType.RANDOM)
		{
			// Add game to the history
			pongDb.saveMatch(gameInstance.playerLeftId, gameInstance.playerRightId, winner);

			// Update player stats
			pongDb.updateUserStats(winner, 1, 0);
			pongDb.updateUserStats(loser, 0, 1);
		}

		if (this._moveTimeouts.has(gameInstance.id))
		{
			clearTimeout(this._moveTimeouts.get(gameInstance.id));
			this._moveTimeouts.delete(gameInstance.id);
		}

		if (this._randomGameCooldowns.has(gameInstance.id))
		{
			clearTimeout(this._randomGameCooldowns.get(gameInstance.id));
			this._randomGameCooldowns.delete(gameInstance.id);
		}

		// Remove the game from the active games map
		this._games.delete(gameInstance.id);

		if (quit)
			console.log(`[PONG] Game ${gameInstance.id} ended due to player ${loser} quit. Winner: ${winner}`);
		else if (timedOut)
			console.log(`[PONG] Game ${gameInstance.id} ended due to timeout of player ${loser}. Winner: ${winner}`);
		else
			console.log(`[PONG] Game ${gameInstance.id} ended. Winner: ${winner}`);
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

	_startMoveTimeout(gameId)
	{
		// start move timeout for the next player
		const	timeoutId = setTimeout(() =>
		{
			// Check if game is still in progress
			const	currentGameInstance = this._games.get(gameId);
			if (!currentGameInstance || currentGameInstance.gameStatus !== GameStatus.IN_PROGRESS)
				return ;

			const	loserId = currentGameInstance.turn;
			const	winnerId = (loserId === currentGameInstance.playerLeftId) ? currentGameInstance.playerRightId : currentGameInstance.playerLeftId;
			
			console.log(`[PONG] Player ${loserId} timed out in game ${gameId}, awarding victory to ${winnerId}`);

			this._gameEnd(currentGameInstance, winnerId, loserId, false, true);

		}, process.env.MOVE_TIMEOUT_MS);
		this._moveTimeouts.set(gameId, timeoutId);
	}
}

export const	gameManager = new GameManager();