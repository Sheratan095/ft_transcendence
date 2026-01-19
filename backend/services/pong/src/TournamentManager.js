import { TournamentInstance, TournamentStatus } from './TournamentIstance.js';
import { pongConnectionManager } from './PongConnectionManager.js';
import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { gameManager } from './GameManager.js';
import { v4 as uuidv4 } from 'uuid';

class	TournamentManager
{
	constructor()
	{
		this._tournaments = new Map(); // tournamentId -> TournamentInstance
		this._tournamentGames = new Map(); // gameId -> tournamentId

		this.MIN_PLAYERS = parseInt(process.env.MIN_PLAYERS_FOR_TOURNAMENT_START);
	}
	
	createTournament(name, creatorId, creatorUsername)
	{
		const	id = uuidv4();

		// Create a new tournament instance
		const	tournament = new TournamentInstance(id, name, creatorId, creatorUsername);

		this._tournaments.set(id, tournament);

		pongConnectionManager.replyTournamentCreated(creatorId, name, id);

		return (tournament);
	}

	getAllTournaments()
	{
		// Map the tournaments to a simpler format
		const	tournamentList = [];

		for (let tournament of this._tournaments.values())
		{
			tournamentList.push({
				id: tournament.id,
				name: tournament.name,
				status: tournament.status,
				createdAt: tournament.createdAt,
				creatorUsername: tournament.creatorUsername,
				participantCount: tournament.participants.size,
			});
		}

		return (tournamentList);
	}

	addParticipant(tournamentId, userId, username)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to join non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		// Only allow joining if the tournament is in WAITING status
		if (tournament.status !== TournamentStatus.WAITING)
		{
			console.log(`[PONG] User ${userId} tried to join tournament ${tournamentId} which is not in WAITING status`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament is not open for joining');
			return ;
		}

		tournament.addParticipant(userId, username);

		// Reply to the user and notify other participants
		for (let participant of tournament.participants)
		{
			if (participant.userId !== userId)
				pongConnectionManager.notifyTournamentParticipantJoined(participant.userId, username, tournament.name, tournamentId);
		}
	}

	getParticipants(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] Tried to get participants of non-existent tournament ${tournamentId}`);
			return ([]); // Return empty array if tournament does not exist
		}

		return (Array.from(tournament.participants).map(participant => ({
			userId: participant.userId,
			username: participant.username
		})));
	}

	// TO DO
	handleUserDisconnect(userId)
	{
		for (let tournament of this._tournaments.values())
		{
			if (tournament.hasParticipant(userId))
				this.removeParticipant(tournament.id, userId);
		}
	}

	removeParticipant(tournamentId, userId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to leave non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		if (!tournament.hasParticipant(userId))
		{
			console.log(`[PONG] User ${userId} tried to leave tournament ${tournamentId} but is not a participant`);
			pongConnectionManager.sendErrorMessage(userId, 'You are not a participant of this tournament');
		}

		tournament.removeParticipant(userId);

		// Notify remaining participants
		for (let participant of tournament.participants)
			pongConnectionManager.notifyTournamentParticipantLeft(participant.userId, userId, tournament.name, tournamentId);
	}

	startTournament(tournamentId, userId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to start non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		// Only the creator can start the tournament
		if (tournament.creatorId !== userId)
		{
			console.log(`[PONG] User ${userId} tried to start tournament ${tournamentId} but is not the creator`);
			pongConnectionManager.sendErrorMessage(userId, 'Only the tournament creator can start the tournament');
			return ;
		}

		// Check if there are enough participants
		if (tournament.participants.size < this.MIN_PLAYERS)
		{
			console.log(`[PONG] User ${userId} tried to start tournament ${tournamentId} but not enough participants (${tournament.participants.size}/${this.MIN_PLAYERS})`);
			pongConnectionManager.sendErrorMessage(userId, `At least ${this.MIN_PLAYERS} participants are required to start the tournament`);
			return ;
		}

		tournament.startTournament();

		// Notify all participants about tournament start and their matches
		for (let participant of tournament.participants)
			pongConnectionManager.notifyTournamentStarted(participant.userId, tournament.name, tournamentId);

		// Send bracket/match info to all participants
		this._broadcastCurrentRound(tournamentId);

		console.log(`[PONG] Tournament ${tournamentId} started with ${tournament.participants.size} players`);
	}

	playerReady(tournamentId, userId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to ready up in non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return;
		}

		if (tournament.status !== TournamentStatus.IN_PROGRESS)
		{
			console.log(`[PONG] User ${userId} tried to ready up but tournament ${tournamentId} is not in progress`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament is not in progress');
			return;
		}

		const	match = tournament.playerReady(userId);
		if (!match)
		{
			console.log(`[PONG] User ${userId} tried to ready up but has no active match in tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'You have no active match');
			return;
		}

		// Notify opponent that this player is ready
		const	opponentId = match.player1.userId === userId ? match.player2?.userId : match.player1.userId;
		if (opponentId)
			pongConnectionManager.notifyTournamentPlayerReady(opponentId, userId, match.matchId);

		// If both players are ready, create and start the game
		if (tournament.isMatchReady(match.matchId))
		{
			this._startMatch(tournament, match);
		}

		console.log(`[PONG] User ${userId} ready for match ${match.matchId}`);
	}

	_startMatch(tournament, match)
	{
		const	gameId = uuidv4();
		const	gameInstance = new GameInstance(
			gameId,
			match.player1.userId,
			match.player2.userId,
			match.player1.username,
			match.player2.username,
			GameType.CUSTOM // Tournament games use custom game type
		);

		// Mark as tournament game
		gameInstance.isTournamentGame = true;
		gameInstance.tournamentId = tournament.id;
		gameInstance.matchId = match.matchId;

		// Set game to IN_LOBBY and both players ready (skip normal ready-up since we did it already)
		gameInstance.gameStatus = GameStatus.IN_LOBBY;
		gameInstance.playerLeftReady = true;
		gameInstance.playerRightReady = true;

		// Register game with GameManager
		gameManager._games.set(gameId, gameInstance);

		// Track this game
		this._tournamentGames.set(gameId, tournament.id);
		tournament.setMatchInProgress(match.matchId, gameId);

		// Start the game immediately
		gameInstance.startGame();

		// Notify both players
		pongConnectionManager.sendTournamentMatchStarted(match.player1.userId, gameId, match.matchId);
		pongConnectionManager.sendTournamentMatchStarted(match.player2.userId, gameId, match.matchId);

		console.log(`[PONG] Tournament match ${match.matchId} started (gameId: ${gameId})`);

		return gameInstance;
	}

	handleGameEnd(gameId, winnerId, loserId)
	{
		const	tournamentId = this._tournamentGames.get(gameId);
		if (!tournamentId)
			return; // Not a tournament game

		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.error(`[PONG] Tournament ${tournamentId} not found for game ${gameId}`);
			return;
		}

		// Find the match by gameId
		let match = null;
		for (const m of tournament.getCurrentMatches())
		{
			if (m.gameId === gameId)
			{
				match = m;
				break;
			}
		}

		if (!match)
		{
			console.error(`[PONG] Match not found for game ${gameId} in tournament ${tournamentId}`);
			return;
		}

		// Set match winner
		tournament.setMatchWinner(match.matchId, winnerId);

		// Clean up game tracking
		this._tournamentGames.delete(gameId);

		// Notify all participants about match result
		for (let participant of tournament.participants)
		{
			const	winnerUsername = match.player1.userId === winnerId ? match.player1.username : match.player2.username;
			pongConnectionManager.notifyTournamentMatchEnded(participant.userId, match.matchId, winnerId, winnerUsername);
		}

		// Check if tournament is finished
		if (tournament.status === TournamentStatus.FINISHED)
		{
			this._endTournament(tournament);
		}
		// Check if round is complete and new round started
		else if (tournament.currentRound < tournament.rounds.length - 1)
		{
			// New round was created, broadcast it
			this._broadcastCurrentRound(tournamentId);
		}

		console.log(`[PONG] Tournament match ${match.matchId} ended, winner: ${winnerId}`);
	}

	_broadcastCurrentRound(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return;

		const	currentMatches = tournament.getCurrentMatches();
		
		for (let participant of tournament.participants)
		{
			const	playerMatch = currentMatches.find(m => 
				m.player1.userId === participant.userId || m.player2?.userId === participant.userId
			);

			pongConnectionManager.sendTournamentRoundInfo(
				participant.userId,
				tournament.currentRound + 1,
				currentMatches.length,
				playerMatch || null
			);
		}
	}

	_endTournament(tournament)
	{
		// Notify all participants of tournament end
		for (let participant of tournament.participants)
		{
			pongConnectionManager.notifyTournamentEnded(
				participant.userId,
				tournament.id,
				tournament.winner.userId,
				tournament.winner.username
			);
		}

		// Clean up
		this._tournaments.delete(tournament.id);

		console.log(`[PONG] Tournament ${tournament.id} ended, winner: ${tournament.winner.username}`);
	}

	isTournamentGame(gameId)
	{
		return this._tournamentGames.has(gameId);
	}
}

export const	tournamentManager = new TournamentManager();