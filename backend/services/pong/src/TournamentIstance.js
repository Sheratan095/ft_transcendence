import { GameInstance, GameType, GameStatus } from './GameInstance.js';
import { v4 as uuidv4 } from 'uuid';

export const	TournamentStatus =
{
	WAITING: 'WAITING', // Just for custom games, waiting for opponent to join
	IN_PROGRESS: 'IN_PROGRESS',
	FINISHED: 'FINISHED',
};

export class	TournamentInstance
{
	constructor(id, name, creatorId, creatorUsername)
	{
		this.id = id;
		this.createdAt = new Date();

		this.name = name;

		this.creatorId = creatorId;
		this.creatorUsername = creatorUsername;

		this.participants = new Set(); // Initialize participants before adding
		this.addParticipant(creatorId, creatorUsername);

		this.status = TournamentStatus.WAITING;
		this.currentRound = 1;
		this.rounds = []; // Array of rounds, each round contains matches
	}

	addParticipant(userId, username)
	{
		this.participants.add({ userId, username });
	}

	hasParticipant(userId)
	{
		for (let participant of this.participants)
		{
			if (participant.userId === userId)
				return (true);
		}
		return (false);
	}

	removeParticipant(userId)
	{
		// Remove participant by userId - find the object and delete it
		for (let participant of this.participants)
		{
			if (participant.userId === userId)
			{
				this.participants.delete(participant);
				break;
			}
		}
	}

	startTournament()
	{
		this.status = TournamentStatus.IN_PROGRESS;

		// Shuffle participants
		const	shuffledParticipants = Array.from(this.participants).sort(() => Math.random() - 0.5);
		this.participants = new Set(shuffledParticipants);

		// Create first round
		this._createRound(shuffledParticipants);
	}

	_createRound(players)
	{
		const	matches = [];

		for (let i = 0; i < players.length; i += 2)
		{
			// Pair participants into matches
			if (i + 1 < players.length)
			{
				// Normal match
				const	gameInstance = new GameInstance(
					uuidv4(),
					players[i].userId,
					players[i + 1].userId,
					players[i].username,
					players[i + 1].username,
					GameType.TOURNAMENT
				);

				gameInstance.tournamentId = this.id;
				gameInstance.gameStatus = GameStatus.WAITING;


				matches.push(gameInstance);
			}
			else
			{
				// Bye: player automatically advances
				const	gameInstance = new GameInstance(
					uuidv4(),
					players[i].userId,
					null,
					players[i].username,
					null,
					GameType.TOURNAMENT
				);

				gameInstance.tournamentId = this.id;
				gameInstance.isBye = true;
				gameInstance.gameStatus = GameStatus.FINISHED;
				gameInstance.winner = players[i];

				matches.push(gameInstance);
			}
		}

		// Add the matches list as a new round
		this.rounds.push(matches);
	}

	playerReady(userId)
	{
		const	currentMatches = this.rounds[this.currentRound - 1];
		if (!currentMatches)
			return null;

		// Find the match this player is in
		for (const match of currentMatches)
		{
			// Skip bye matches
			if (match.isBye)
				continue ;

			if (match.gameStatus !== GameStatus.WAITING)
				continue ;

			if (match.playerLeftId === userId)
			{
				match.playerLeftReady = true;
				return (match);
			}
			else if (match.playerRightId === userId)
			{
				match.playerRightReady = true;
				return (match);
			}
		}

		return (null);
	}

	isMatchReady(gameId)
	{
		const	match = this._findMatchByGameId(gameId);
		if (!match || match.isBye)
			return (false);

		if (match.gameStatus !== GameStatus.WAITING)
			return (false);

		return (match.playerLeftReady && match.playerRightReady);
	}

	startMatch(gameId)
	{
		const	match = this._findMatchByGameId(gameId);
		if (!match || match.isBye)
			return (null);

		// Start the match
		match.gameStatus = GameStatus.IN_PROGRESS;
		match.startGame();

		return (match);
	}

	setMatchWinner(gameId, winnerId)
	{
		const	match = this._findMatchByGameId(gameId);
		if (!match)
			return ;

		match.gameStatus = GameStatus.FINISHED;
		
		// Store winner info
		if (match.playerLeftId === winnerId)
			match.winner = { userId: match.playerLeftId, username: match.playerLeftUsername };
		else if (match.playerRightId === winnerId)
			match.winner = { userId: match.playerRightId, username: match.playerRightUsername };

		// Check if this round is complete
		if (this._isRoundComplete())
			this._advanceToNextRound();
	}

	_isRoundComplete()
	{
		const	currentMatches = this.rounds[this.currentRound - 1];
		if (!currentMatches)
			return (false);

		return (currentMatches.every(match => match.gameStatus === GameStatus.FINISHED));
	}

	_advanceToNextRound()
	{
		const	currentMatches = this.rounds[this.currentRound - 1];
		const	winners = currentMatches.map(match => match.winner).filter(w => w !== null);

		// If only one winner, tournament is over
		if (winners.length === 1)
		{
			this.status = TournamentStatus.FINISHED;
			this.winner = winners[0];
			return ;
		}

		// Create next round with winners
		this._createRound(winners);
		this.currentRound++;
	}

	_findMatchByGameId(gameId)
	{
		for (const round of this.rounds)
		{
			const	match = round.find(m => !m.isBye && m.id === gameId);
			if (match)
				return (match);
		}

		return (null);
	}

	getCurrentMatches()
	{
		return (this.rounds[this.currentRound - 1]);
	}

	getMatchForPlayer(userId)
	{
		// TO DO check
		const	currentMatches = this.getCurrentMatches();

		return (currentMatches.find(m => {
			if (m.isBye)
				return m.player1?.userId === userId;
			return m.playerLeftId === userId || m.playerRightId === userId;
		}) || null);
	}

	getAllGames()
	{
		// Return all GameInstance objects from all rounds (excluding bye matches)
		const	games = [];

		for (const round of this.rounds)
		{
			for (const match of round)
			{
				if (!match.isBye)
					games.push(match);
			}
		}

		return (games);
	}
}
