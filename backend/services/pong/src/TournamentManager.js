import { TournamentInstance, TournamentStatus } from './TournamentIstance.js';
import { GameStatus } from './GameInstance.js';
import { pongConnectionManager } from './PongConnectionManager.js';
import { gameManager } from './GameManager.js';
import { v4 as uuidv4 } from 'uuid';

class	TournamentManager
{
	constructor()
	{
		this._tournaments = new Map(); // tournamentId -> TournamentInstance
		this._matchTimers = new Map(); // matchId -> timer

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
		this._startNewRound(tournamentId);

		console.log(`[PONG] Tournament ${tournamentId} started with ${tournament.participants.size} players`);
	}

	playerReady(tournamentId, userId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			console.log(`[PONG] User ${userId} tried to ready up in non-existent tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			return ;
		}

		if (tournament.status !== TournamentStatus.IN_PROGRESS)
		{
			console.log(`[PONG] User ${userId} tried to ready up but tournament ${tournamentId} is not in progress`);
			pongConnectionManager.sendErrorMessage(userId, 'Tournament is not in progress');
			return ;
		}

		const	match = tournament.playerReady(userId);
		if (!match)
		{
			console.log(`[PONG] User ${userId} tried to ready up but has no active match in tournament ${tournamentId}`);
			pongConnectionManager.sendErrorMessage(userId, 'You have no active match');
			return ;
		}

		// Notify opponent that this player is ready
		const	opponentId = match.playerLeftId === userId ? match.playerRightId : match.playerLeftId;
		if (opponentId)
			pongConnectionManager.notifyTournamentPlayerReady(opponentId, userId, match.id);

		// If both players are ready, clear timer and start the match immediately
		if (tournament.isMatchReady(match.id))
		{
			this._clearMatchTimer(match.id);
			this._startMatch(tournament, match);
		}

		console.log(`[PONG] User ${userId} ready for match ${match.id}`);
	}

	_startMatch(tournament, gameInstance)
	{
		// The gameInstance is already created by TournamentInstance, just need to:
		// 1. Register it with GameManager for game loop processing
		// 2. Start the game
		// 3. Notify players

		gameManager._games.set(gameInstance.id, gameInstance);

		// Start the match
		const	startedMatch = tournament.startMatch(gameInstance.id);
		if (!startedMatch)
		{
			console.error(`[PONG] Failed to start match ${gameInstance.id}`);
			return;
		}

		// Notify both players
		pongConnectionManager.sendTournamentMatchStarted(gameInstance.playerLeftId, gameInstance.id, gameInstance.id);
		pongConnectionManager.sendTournamentMatchStarted(gameInstance.playerRightId, gameInstance.id, gameInstance.id);

		console.log(`[PONG] Tournament match ${gameInstance.id} started`);
	}

	handleGameEnd(gameId, winnerId, loserId)
	{
		// Find which tournament this game belongs to
		let tournament = null;
		for (const t of this._tournaments.values())
		{
			const games = t.getAllGames();
			if (games.find(g => g.id === gameId))
			{
				tournament = t;
				break;
			}
		}

		if (!tournament)
			return; // Not a tournament game

		// Find the match
		const match = tournament._findMatchByGameId(gameId);
		if (!match)
		{
			console.error(`[PONG] Match not found for game ${gameId} in tournament ${tournament.id}`);
			return;
		}

		// Set match winner
		tournament.setMatchWinner(gameId, winnerId);

		// Notify all participants about match result
		const winnerUsername = match.playerLeftId === winnerId ? match.playerLeftUsername : match.playerRightUsername;
		for (let participant of tournament.participants)
		{
			pongConnectionManager.notifyTournamentMatchEnded(participant.userId, match.id, winnerId, winnerUsername);
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
			this._startNewRound(tournament.id);
		}

		console.log(`[PONG] Tournament match ${match.id} ended, winner: ${winnerId}`);
	}

	_startNewRound(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return ;

		const	currentMatches = tournament.getCurrentMatches();
		
		// Start ready timers for all matches in this round
		for (let match of currentMatches)
		{
			if (!match.isBye && match.gameStatus === GameStatus.WAITING)
				this._startMatchTimer(tournament, match);
		}

		// Notify all participants about their match info
		for (let participant of tournament.participants)
		{
			const	playerMatch = currentMatches.find(m => 
				m.playerLeftId === participant.userId || m.playerRightId === participant.userId
			);

			pongConnectionManager.sendTournamentRoundInfo(
				participant.userId,
				tournament.currentRound + 1,
				currentMatches.length,
				playerMatch || null
			);
		}
	}

	_startMatchTimer(tournament, match)
	{
		// Clear any existing timer
		this._clearMatchTimer(match.id);

		// Set timer to auto-start the game after cooldown
		const timer = setTimeout(() => {
			// Verify match is still in waiting state
			if (match.gameStatus === GameStatus.WAITING)
			{
				console.log(`[PONG] Ready timer expired for match ${match.id}, auto-starting...`);
				this._matchTimers.delete(match.id);
				this._startMatch(tournament, match);
			}
		}, process.env.READY_COOLDOWN_MS || 5000);

		this._matchTimers.set(match.id, timer);
	}

	_clearMatchTimer(matchId)
	{
		const timer = this._matchTimers.get(matchId);
		if (timer)
		{
			clearTimeout(timer);
			this._matchTimers.delete(matchId);
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
}

export const	tournamentManager = new TournamentManager();