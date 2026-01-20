import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';
import { trisConnectionManager } from './TrisConnectionManager.js';
import { sendGameInviteNotification, getUsernameById, sleep, checkBlock, isUserBusyInternal } from './tris-help.js';
import { trisDatabase as trisDb } from './tris.js';

class	GameManager
{
	constructor()
	{
		this._games = new Map(); // gameId -> GameInstance
		this._waitingPlayers = []; // Queue of players waiting for a match
		this._randomGameCooldowns = new Map(); // gameId -> timeoutId used to start the game after cooldown
		this._moveTimeouts = new Map(); // gameId -> timeoutId
	}

	async createCustomGame(creatorId, creatorUsername, otherId, otherUsername)
	{
		// User must not be busy (in matchmaking or in another game, including PONG)
		if (await isUserBusyInternal(creatorId, true))
		{
			console.error(`[TRIS] ${creatorId} tried to create custom game while busy`);
			trisConnectionManager.sendErrorMessage(creatorId, 'You are already in a game or matchmaking');
			return ;
		}

		// Can't create a game with yourself
		if (creatorId === otherId)
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with themselves`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with yourself');
			return ;
		}

		// Can't create a game with a player who blocked you or whom you blocked
		if (await checkBlock(creatorId, otherId))
		{
			console.error(`[TRIS] ${creatorId} tried to create a custom game with ${otherId} but is blocked`);
			trisConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with this user');
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

	// Could be used also to decline an invitation, actually isn't
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

	async joinCustomGame(playerId, gameId)
	{
		// User must not be busy (in matchmaking or in another game, including PONG)
		if (await isUserBusyInternal(playerId, true))
		{
			console.error(`[TRIS] ${playerId} tried to join custom game ${gameId} while busy`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[TRIS] ${playerId} tried to join a non-existent game ${gameId}`);
			trisConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return ;
		}

		// Check if game is a custom game and in WAITING status
		if (gameInstance.gameType !== GameType.CUSTOM || gameInstance.gameStatus !== GameStatus.WAITING)
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

		const	otherPlayerId = (gameInstance.playerXId === playerId) ? gameInstance.playerOId : gameInstance.playerXId;
		// If the match is IN_PROGRESS (started), the other player wins
		if (gameInstance.gameStatus === GameStatus.IN_PROGRESS)
		{
			this._gameEnd(gameInstance, otherPlayerId, playerId, true, false);
		}
		else if (gameInstance.gameStatus === GameStatus.IN_LOBBY && gameInstance.gameType === GameType.CUSTOM)
		{
			// If the match is in LOBBY and is a CUSTOM game, quitting cancels the game for both players
			console.log(`[TRIS] Player ${playerId} quit game custom game ${gameId}, game is canceled`);

			trisConnectionManager.sendPlayerQuitCustomGameInLobby(otherPlayerId, gameId);

			// Remove the game from the active games map
			this._games.delete(gameId);
		}
		else if (gameInstance.gameStatus === GameStatus.IN_LOBBY && gameInstance.gameType === GameType.RANDOM)
		{
			// If the match is in LOBBY and is a RANDOM game, quitting gives victory to the other player
			console.log(`[TRIS] Player ${playerId} quit game random game ${gameId}, game is canceled`);

			this._gameEnd(gameInstance, otherPlayerId, playerId, true, false);
		}
	}

	async joinMatchmaking(playerId)
	{
		// User must not be busy (in matchmaking or in another game, including PONG)
		if (await isUserBusyInternal(playerId, true))
		{
			console.error(`[TRIS] ${playerId} tried to join matchmaking while busy`);
			trisConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		console.log(`[TRIS] Player ${playerId} joined matchmaking queue`);

		// Slight delay to allow user to leave matchmaking immediately after joining
		// This prevents instant matches that the user didn't want
		await sleep(1000);

		// Try to create a random game
		this._createRandomGameIfPossible(playerId);
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
		// WAITING status is possible only for CUSTOM GAMES
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

		// Clear any existing move timeout for this game
		if (this._moveTimeouts.has(gameId))
		{
			clearTimeout(this._moveTimeouts.get(gameId));
			this._moveTimeouts.delete(gameId);
		}

		const	result = gameInstance.processMove(playerId, move);
		if (result && result.winner && result.loser)
			this._gameEnd(gameInstance, result.winner, result.loser, false, false);

		// Start move timeout for the next player
		this._startMoveTimeout(gameId);
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
			// The creator of a CUSTOM game in WAITING status must cancel it, can't just quit
			if (gameInstance.gameType === GameType.CUSTOM && gameInstance.gameStatus === GameStatus.WAITING && gameInstance.playerXId === userId)
				this.cancelCustomGame(userId, gameInstance.id);
			else if (gameInstance.hasPlayer(userId))
				this.quitGame(userId, gameInstance.id);
		}
	}

	async _createRandomGameIfPossible(justJoinedPlayerId)
	{
		let	opponentId = null;

		for (let i = 0; i < this._waitingPlayers.length; i++)
		{
			if (this._waitingPlayers[i] === justJoinedPlayerId)
				continue ;

			// If blocks must be considered
			if (process.env.MATCHMAKING_IGNORE_BLOCKS === 'false')
			{
				// Check if the two players have blocked each other
				const	blocked = await checkBlock(justJoinedPlayerId, this._waitingPlayers[i]);
				if (blocked)
					continue ;
			}

			opponentId = this._waitingPlayers[i];

			// Remove opponent from waiting queue
			this._waitingPlayers.splice(i, 1);

			// Exit loop after finding the first suitable opponent
			break ;
		}

		// If no opponent found, add the player to the waiting queue
		if (opponentId === null)
		{
			this._waitingPlayers.push(justJoinedPlayerId);
			return ;
		}

		const	player1Id = justJoinedPlayerId;
		const	player2Id = opponentId;

		let	playerX;
		let	playerO;
		let	playerOUsername;
		let	playerXUsername;

		// Randomly assign X and O
		if (Math.random() < 0.5)
		{
			playerX = player1Id;
			playerXUsername = await getUsernameById(playerX);
			playerO = player2Id;
			playerOUsername = await getUsernameById(playerO);
		}
		else
		{
			playerX = player2Id;
			playerXUsername = await getUsernameById(playerX);
			playerO = player1Id;
			playerOUsername = await getUsernameById(playerO);
		}

		// Generate gameId and GameInstance
		const	gameId = uuidv4();
		const	gameInstance = new GameInstance(gameId, playerX, playerO, playerXUsername, playerOUsername, GameType.RANDOM);

		this._games.set(gameId, gameInstance);

		// Notify both players that they have been matched
		trisConnectionManager.notifyMatchedInRandomGame(playerX, gameId, 'X', playerOUsername, true); // X ALWAYS STARTS FIRST
		trisConnectionManager.notifyMatchedInRandomGame(playerO, gameId, 'O', playerXUsername, false);

		console.log(`[TRIS] Matched players ${playerX} and ${playerO} in random game ${gameId}`);

		// Start cooldown timer before starting the game
		const	timerId = setTimeout(() =>
		{
			const	gameInstance = this._games.get(gameId);

			if (gameInstance && gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
			{
				console.log(`[TRIS] Cooldown for game ${gameId} ended, starting game automatically`);
				this._gameStart(gameInstance); // Start the game automatically after cooldown
			}
		}, process.env.READY_COOLDOWN_MS || 30000); // Default cooldown is 30 seconds

		this._randomGameCooldowns.set(gameId, timerId);
	}

	_gameStart(gameInstance)
	{
		console.log(`[TRIS] Starting game ${gameInstance.id} between ${gameInstance.playerXId} and ${gameInstance.playerOId}`);

		// Clear cooldown timer if present
		if (this._randomGameCooldowns.has(gameInstance.id))
		{
			clearTimeout(this._randomGameCooldowns.get(gameInstance.id));
			this._randomGameCooldowns.delete(gameInstance.id);
		}

		// Update game status
		gameInstance.startGame();

		// Notify both players that the game has started
		trisConnectionManager.notifyGameStart(gameInstance.playerXId, gameInstance.id, 'X', gameInstance.playerOUsername, true);
		trisConnectionManager.notifyGameStart(gameInstance.playerOId, gameInstance.id, 'O', gameInstance.playerXUsername, false);

		// Start move timeout for the next player
		this._startMoveTimeout(gameInstance.id);
	}

	// Both user must be specified by input, can't be calculated from gameInstance because winner and loser depends on quit
	_gameEnd(gameInstance, winner, loser, quit, timedOut)
	{
		// Notify both players that the game has ended, not incluging message, it will included handled client-side
		trisConnectionManager.sendGameEnded(gameInstance.playerXId, gameInstance.id, winner, quit, timedOut);
		trisConnectionManager.sendGameEnded(gameInstance.playerOId, gameInstance.id, winner, quit, timedOut);

		if (gameInstance.gameType === GameType.RANDOM)
		{
			// Add game to the history
			trisDb.saveMatch(gameInstance.playerXId, gameInstance.playerOId, winner);

			// Update player stats
			trisDb.updateUserStats(winner, 1, 0);
			trisDb.updateUserStats(loser, 0, 1);
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
			console.log(`[TRIS] Game ${gameInstance.id} ended due to player ${loser} quit. Winner: ${winner}`);
		else if (timedOut)
			console.log(`[TRIS] Game ${gameInstance.id} ended due to timeout of player ${loser}. Winner: ${winner}`);
		else
			console.log(`[TRIS] Game ${gameInstance.id} ended. Winner: ${winner}`);
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
			const	winnerId = (loserId === currentGameInstance.playerXId) ? currentGameInstance.playerOId : currentGameInstance.playerXId;
			
			console.log(`[TRIS] Player ${loserId} timed out in game ${gameId}, awarding victory to ${winnerId}`);

			this._gameEnd(currentGameInstance, winnerId, loserId, false, true);

		}, process.env.MOVE_TIMEOUT_MS);
		this._moveTimeouts.set(gameId, timeoutId);
	}
}

export const	gameManager = new GameManager();