import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';
import { pongConnectionManager } from './PongConnectionManager.js';
import { sendGameInviteNotification, getUsernameById, sleep, checkBlock } from './pong-help.js';
import { pongDatabase as pongDb } from './pong.js';

class	GameManager
{
	constructor()
	{
		this._games = new Map(); // gameId -> GameInstance
		this._waitingPlayers = []; // Queue of players waiting for a match
		this._randomGameCooldowns = new Map(); // gameId -> timeoutId used to start the game after cooldown
	}

	async createCustomGame(creatorId, creatorUsername, otherId, otherUsername)
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

		// Can't create a game with a player who blocked you or whom you blocked
		if (await checkBlock(creatorId, otherId))
		{
			console.error(`[PONG] ${creatorId} tried to create a custom game with ${otherId} but is blocked`);
			pongConnectionManager.sendErrorMessage(creatorId, 'Cannot create a game with this user');
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
			const	winnerUsername = (otherPlayerId === gameInstance.playerLeftId) ? gameInstance.playerLeftUsername : gameInstance.playerRightUsername;
			this._gameEnd(gameInstance, otherPlayerId, playerId, winnerUsername, true);
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

			const	winnerUsername = (otherPlayerId === gameInstance.playerLeftId) ? gameInstance.playerLeftUsername : gameInstance.playerRightUsername;
			this._gameEnd(gameInstance, otherPlayerId, playerId, winnerUsername, true);
		}
	}

	async joinMatchmaking(playerId)
	{
		// User must not be busy (in matchmaking or in another game)
		if (this._isUserBusy(playerId))
		{
			console.error(`[PONG] ${playerId} tried to join matchmaking while busy`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are already in a game or matchmaking');
			return ;
		}

		console.log(`[PONG] Player ${playerId} joined matchmaking queue`);

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

	processPaddleMove(playerId, gameId, direction)
	{
		const	gameInstance = this._games.get(gameId);
		if (!gameInstance) // Check if game exists
		{
			console.error(`[PONG] ${playerId} tried to move paddle in non-existent game ${gameId}`);
			pongConnectionManager.sendErrorMessage(playerId, 'Game not found');
			return;
		}

		// Check if player is part of the game
		if (!gameInstance.hasPlayer(playerId))
		{
			console.error(`[PONG] ${playerId} tried to move paddle in game ${gameId} they are not part of`);
			pongConnectionManager.sendErrorMessage(playerId, 'You are not part of this game');
			return;
		}

		// Check if game is in progress
		if (gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
		{
			console.error(`[PONG] ${playerId} tried to move paddle in game ${gameId} that is not in progress`);
			pongConnectionManager.sendErrorMessage(playerId, 'Game is not in progress');
			return;
		}

		// Process the paddle move
		gameInstance.processMove(playerId, direction);
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
			// The creator of a CUSTOM game in WAITING status must cancel it, can't just quit
			if (gameInstance.gameType === GameType.CUSTOM && gameInstance.gameStatus === GameStatus.WAITING && gameInstance.playerLeftId === userId)
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

		let	playerLeftId;
		let	playerRightId;
		let	playerLeftUsername;
		let	playerRightUsername;

		// Randomly assign X and O
		if (Math.random() < 0.5)
		{
			playerLeftId = player1Id;
			playerLeftUsername = await getUsernameById(playerLeftId);
			playerRightId = player2Id;
			playerRightUsername = await getUsernameById(playerRightId);
		}
		else
		{
			playerLeftId = player2Id;
			playerLeftUsername = await getUsernameById(playerLeftId);
			playerRightId = player1Id;
			playerRightUsername = await getUsernameById(playerRightId);
		}

		// Generate gameId and GameInstance
		const	gameId = uuidv4();
		const	gameInstance = new GameInstance(gameId, playerLeftId, playerRightId, playerLeftUsername, playerRightUsername, GameType.RANDOM);

		this._games.set(gameId, gameInstance);

		// Notify both players that they have been matched
		pongConnectionManager.notifyMatchedInRandomGame(playerLeftId, gameId, playerRightUsername, 'LEFT');
		pongConnectionManager.notifyMatchedInRandomGame(playerRightId, gameId, playerLeftUsername, 'RIGHT');

		console.log(`[PONG] Matched players ${playerLeftId} and ${playerRightId} in random game ${gameId}`);

		// Start cooldown timer before starting the game
		const	timerId = setTimeout(() =>
		{
			const	gameInstance = this._games.get(gameId);

			if (gameInstance && gameInstance.gameStatus !== GameStatus.IN_PROGRESS)
			{
				console.log(`[PONG] Cooldown for game ${gameId} ended, starting game automatically`);
				this._gameStart(gameInstance); // Start the game automatically after cooldown
			}
		}, process.env.COOLDOWN_MS); // Default cooldown is 30 seconds

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
		pongConnectionManager.notifyGameStart(gameInstance.playerLeftId, gameInstance.id, 'LEFT', gameInstance.playerRightUsername);
		pongConnectionManager.notifyGameStart(gameInstance.playerRightId, gameInstance.id, 'RIGHT', gameInstance.playerLeftUsername);
	}

	// Both user must be specified by input, can't be calculated from gameInstance because winner and loser depends on quit
	_gameEnd(gameInstance, winner, loser, winnerUsername, quit)
	{
		// Notify both players that the game has ended, not incluging message, it will included handled client-side
		pongConnectionManager.sendGameEnded(gameInstance.playerLeftId, gameInstance.id, winner, winnerUsername, quit);
		pongConnectionManager.sendGameEnded(gameInstance.playerRightId, gameInstance.id, winner, winnerUsername, quit);

		if (gameInstance.gameType === GameType.RANDOM)
		{
			// Add game to the history
			pongDb.saveMatch(gameInstance.playerLeftId, gameInstance.playerRightId, winner);

			// Update player stats
			pongDb.updateUserStats(winner, 1, 0);
			pongDb.updateUserStats(loser, 0, 1);
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
}

export const	gameManager = new GameManager();