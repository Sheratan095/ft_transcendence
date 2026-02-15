import { TournamentInstance, TournamentStatus } from './TournamentIstance.js';
import { GameStatus } from './GameInstance.js';
import { pongConnectionManager } from './PongConnectionManager.js';
import { gameManager } from './GameManager.js';
import { pongDatabase as pongDb } from './pong.js';
import { calculateTop } from './pong-help.js';
import { v4 as uuidv4 } from 'uuid';

class	TournamentManager
{
	constructor()
	{
		this._tournaments = new Map(); // tournamentId -> TournamentInstance
		this._matchTimers = new Map(); // matchId -> timer
		this._roundTransitionTimers = new Map(); // tournamentId -> timer

		this.MIN_PLAYERS = parseInt(process.env.MIN_PLAYERS_FOR_TOURNAMENT_START);
		this.ROUND_TRANSITION_COOLDOWN_MS = parseInt(process.env.ROUND_TRANSITION_COOLDOWN_MS) || 5000;
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

	async addParticipant(tournamentId, userId, username)
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

	async handleUserDisconnect(userId)
	{
		for (let tournament of this._tournaments.values())
		{
			if (tournament.hasParticipant(userId))
			{
				console.log(`[PONG] User ${userId} disconnected from tournament ${tournament.id}`);
				await this.removeParticipant(tournament.id, userId, true);
			}
		}
	}

	async removeParticipant(tournamentId, userId, isDisconnect = false)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
		{
			if (!isDisconnect)
			{
				console.log(`[PONG] User ${userId} tried to leave non-existent tournament ${tournamentId}`);
				pongConnectionManager.sendErrorMessage(userId, 'Tournament not found');
			}

			return ;
		}

		if (!tournament.hasParticipant(userId))
		{
			if (!isDisconnect)
			{
				console.log(`[PONG] User ${userId} tried to leave tournament ${tournamentId} but is not a participant`);
				pongConnectionManager.sendErrorMessage(userId, 'You are not a participant of this tournament');
			}
			return ;
		}

		const	isCreator = tournament.creatorId === userId;

		// If the tournament is in progress, handle forfeiting active match
		if (tournament.status === TournamentStatus.IN_PROGRESS)
		{
			const	match = tournament.getMatchForPlayer(userId);
			if (match)
			{
				// Clear any ready timer for this match
				this._clearMatchTimer(match.id);

				// Clean up game instance if it exists
				if (match.gameStatus === GameStatus.IN_PROGRESS)
				{
					const	game = gameManager._games.get(match.id);
					if (game)
					{
						game.forceEnd();
						gameManager._games.delete(match.id);
					}
				}

				// Forfeit the match - opponent wins
				const	opponentId = match.playerLeftId === userId ? match.playerRightId : match.playerLeftId;
				const	opponentUsername = match.playerLeftId === opponentId ? match.playerLeftUsername : match.playerRightUsername;

				tournament.setMatchWinner(match.id, opponentId);

				// Update top placement for forfeiting player
				this._updateTopForEliminatedPlayer(tournament, userId);

				// Notify all participants about the forfeit
				for (let participant of tournament.participants)
				{
					pongConnectionManager.notifyTournamentMatchEnded(
						participant.userId, 
						match.id, 
						opponentId, 
						opponentUsername,
						true // forfeit flag
					);
				}

				console.log(`[PONG] User ${userId} forfeited match ${match.id}, opponent ${opponentId} wins`);

				// Check if tournament finished or new round should start
				if (tournament.status === TournamentStatus.FINISHED)
				{
					this._endTournament(tournament);
					return ; // Don't continue processing, tournament is done
				}
				else if (tournament.isRoundComplete())
				{
					// Advance to next round after cooldown
					this._scheduleNextRound(tournament.id);
				}
			}
		}

		// Remove participant from tournament
		tournament.removeParticipant(userId);

		// Check if tournament should be cancelled or ended
		if (tournament.participants.size === 0)
		{
			// No participants left, clean up tournament
			console.log(`[PONG] Tournament ${tournamentId} has no participants left, cleaning up`);
			this._cleanupTournament(tournamentId);
			return ;
		}
		else if (isCreator && tournament.status === TournamentStatus.WAITING)
		{
			// Creator left before tournament started, cancel it
			console.log(`[PONG] Tournament creator left ${tournamentId}, cancelling tournament`);

			for (let participant of tournament.participants)
				pongConnectionManager.notifyTournamentCancelled(participant.userId, tournamentId);

			this._cleanupTournament(tournamentId);

			return ;
		}
		else if (tournament.status === TournamentStatus.IN_PROGRESS && tournament.participants.size === 1)
		{
			// Only one participant left during tournament, declare them winner
			const	remainingPlayer = Array.from(tournament.participants)[0];

			tournament.winner = remainingPlayer;
			tournament.status = TournamentStatus.FINISHED;

			console.log(`[PONG] Only one player remains in tournament ${tournamentId}, declaring winner: ${remainingPlayer.username}`);
			await this._endTournament(tournament);

			return ;
		}

		// Notify remaining participants
		for (let participant of tournament.participants)
		{
			pongConnectionManager.notifyTournamentParticipantLeft(
				participant.userId, 
				userId, 
				tournament.name, 
				tournamentId
			);
		}
	}

	async startTournament(tournamentId, userId)
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

		// Save participants to database and update their stats
		try
		{
			// Save tournament participants and update their participated count
			await pongDb.saveTournamentParticipants(tournamentId, Array.from(tournament.participants));

			console.log(`[PONG] Tournament ${tournamentId} participants saved to database`);
		}
		catch (err)
		{
			console.error(`[PONG] Failed to save tournament participants to database:`, err.message);
		}

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
			return ;
		}

		// Notify both players
		pongConnectionManager.sendTournamentMatchStarted(gameInstance.playerLeftId, gameInstance.id, gameInstance.id);
		pongConnectionManager.sendTournamentMatchStarted(gameInstance.playerRightId, gameInstance.id, gameInstance.id);

		console.log(`[PONG] Tournament match ${gameInstance.id} started`);
	}

	async handleGameEnd(gameId, winnerId, loserId)
	{
		// Find which tournament this game belongs to
		let	tournament = null;
		for (const t of this._tournaments.values())
		{
			const	games = t.getAllGames();
			if (games.find(g => g.id === gameId))
			{
				tournament = t;
				break ;
			}
		}

		if (!tournament)
			return ; // Not a tournament game

		// Find the match
		const	match = tournament._findMatchByGameId(gameId);
		if (!match)
		{
			console.error(`[PONG] Match not found for game ${gameId} in tournament ${tournament.id}`);
			return ;
		}

		// Set match winner
		tournament.setMatchWinner(gameId, winnerId);

		// Update top placement for losing player
		this._updateTopForEliminatedPlayer(tournament, loserId);

		// Notify all participants about match result
		const	winnerUsername = match.playerLeftId === winnerId ? match.playerLeftUsername : match.playerRightUsername;
		for (let participant of tournament.participants)
		{
			pongConnectionManager.notifyTournamentMatchEnded(participant.userId, match.id, winnerId, winnerUsername);
		}

		// Broadcast bracket update
		this._broadcastBracketUpdate(tournament.id);

		// Check if tournament is finished
		if (tournament.status === TournamentStatus.FINISHED)
		{
			await this._endTournament(tournament);
		}
		// Check if round is complete and new round started
		else if (tournament.currentRound <= tournament.rounds.length)
		{
			// New round was created, schedule it after cooldown
			this._scheduleNextRound(tournament.id);
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
				tournament.currentRound,
				currentMatches.length,
				playerMatch || null
			);
		}

		// Broadcast bracket update
		this._broadcastBracketUpdate(tournamentId);
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

	_scheduleNextRound(tournamentId)
	{
		// Clear any existing round transition timer
		this._clearRoundTransitionTimer(tournamentId);

		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return ;

		console.log(`[PONG] Round complete in tournament ${tournamentId}, starting next round in ${this.ROUND_TRANSITION_COOLDOWN_MS}ms`);

		// Notify all participants about the cooldown
		for (let participant of tournament.participants)
		{
			pongConnectionManager.notifyTournamentRoundCooldown(
				participant.userId,
				this.ROUND_TRANSITION_COOLDOWN_MS,
				tournament.currentRound + 1 // Next round number
			);
		}

		// Schedule the next round after cooldown
		const	timer = setTimeout(() => {
			this._roundTransitionTimers.delete(tournamentId);
			this._startNewRound(tournamentId);
		}, this.ROUND_TRANSITION_COOLDOWN_MS);

		this._roundTransitionTimers.set(tournamentId, timer);
	}

	_clearRoundTransitionTimer(tournamentId)
	{
		const timer = this._roundTransitionTimers.get(tournamentId);
		if (timer)
		{
			clearTimeout(timer);
			this._roundTransitionTimers.delete(tournamentId);
		}
	}

	async _endTournament(tournament)
	{
		// Save tournament to database
		try
		{
			await pongDb.saveTournament(
				tournament.id,
				tournament.name,
				tournament.creatorId,
				tournament.winner.userId
			);

			// Update winner stats (increment tournament wins) - 4th param is tournamentsParticipatedDelta (0 since already counted at start)
			await pongDb.updateUserStats(tournament.winner.userId, 0, 0, 1, 0);

			// Set winner's top placement to 1
			await pongDb.updateTournamentParticipantTop(tournament.id, tournament.winner.userId, 1);


			console.log(`[PONG] Tournament ${tournament.id} saved to database, winner: ${tournament.winner.username}`);
		}
		catch (err)
		{
			console.error(`[PONG] Failed to save tournament ${tournament.id} to database:`, err.message);
		}

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
		this._cleanupTournament(tournament.id);

		console.log(`[PONG] Tournament ${tournament.id} ended, winner: ${tournament.winner.username}`);
	}

	_cleanupTournament(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return ;

		// Clear round transition timer
		this._clearRoundTransitionTimer(tournamentId);

		// Clear all match timers
		const	allMatches = tournament.getAllGames();
		for (let match of allMatches)
		{
			this._clearMatchTimer(match.id);
			
			// Clean up any active games
			if (match.gameStatus === GameStatus.IN_PROGRESS)
			{
				const	game = gameManager._games.get(match.id);
				if (game)
				{
					game.forceEnd();
					gameManager._games.delete(match.id);
				}
			}
		}

		// Remove tournament
		this._tournaments.delete(tournamentId);
		console.log(`[PONG] Tournament ${tournamentId} cleaned up`);
	}

	isUserInTournament(userId)
	{
		for (let tournament of this._tournaments.values())
		{
			if (tournament.hasParticipant(userId))
				return (true);
		}

		return (false);
	}

	getTournamentBracket(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return (null);

		// Build bracket structure
		const	rounds = [];
		for (let i = 0; i < tournament.rounds.length; i++)
		{
			const	roundMatches = tournament.rounds[i].map(match => ({
				id: match.id,
				playerLeftId: match.playerLeftId,
				playerLeftUsername: match.playerLeftUsername,
				playerRightId: match.playerRightId,
				playerRightUsername: match.playerRightUsername,
				status: match.gameStatus,
				winnerId: match.winnerId ? match.winnerId : null,
				isBye: match.isBye || false,
				endedAt: match.endedAt || null,
				tournamentId: tournamentId,
				playerLeftScore: match.scores[match.playerLeftId] || 0,
				playerRightScore: match.playerRightId ? match.scores[match.playerRightId] || 0 : 0
			}));

			rounds.push({
				roundNumber: i + 1,
				matches: roundMatches
			});
		}

		return ({
			tournamentId: tournament.id,
			name: tournament.name,
			status: tournament.status,
			currentRound: tournament.currentRound,
			totalRounds: tournament.rounds.length,
			participantCount: tournament.initialParticipantCount,
			winnerId: tournament.winner ? tournament.winner.userId : null,
			rounds: rounds
		});
	}

	_broadcastBracketUpdate(tournamentId)
	{
		const	tournament = this._tournaments.get(tournamentId);
		if (!tournament)
			return;

		const	bracket = this.getTournamentBracket(tournamentId);

		// Broadcast to all participants
		for (let participant of tournament.participants)
			pongConnectionManager.sendTournamentBracketUpdate(participant.userId, bracket);
	}

	async _updateTopForEliminatedPlayer(tournament, userId)
	{
		const	totalPlayers = tournament.initialParticipantCount;
		const	top = calculateTop(totalPlayers, tournament.currentRound);

		try
		{
			await pongDb.updateTournamentParticipantTop(tournament.id, userId, top);
			console.log(`[PONG] Updated top placement for user ${userId} in tournament ${tournament.id}: top ${top}`);
		}
		catch (err)
		{
			console.error(`[PONG] Failed to update top placement for user ${userId}:`, err.message);
		}
	}
}

export const	tournamentManager = new TournamentManager();