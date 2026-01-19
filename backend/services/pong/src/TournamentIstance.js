import { GameInstance, GameType, GameStatus } from './GameInstance.js';

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
		this.currentRound = 0;
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
		// TO DO
		this.participants.delete(userId);
	}

	startTournament()
	{
		this.status = TournamentStatus.IN_PROGRESS;

		// Shuffle participants
		const	shuffledParticipants = Array.from(this.participants).sort(() => Math.random() - 0.5);
		this.participants = new Set(shuffledParticipants);

		// Create first round
		this._createRound(shuffledParticipants);
		this.currentRound = 0;
	}

	_createRound(players)
	{
		const	matches = [];

		for (let i = 0; i < players.length; i += 2)
		{
			// Pair participants into matches
			if (i + 1 < players.length)
			{
				const	newGameInstance =  new GameInstance(
					players[i].userId,
					players[i + 1].userId,
					players[i].username,
					players[i + 1].username,
					GameType.TOURNAMENT
				);

				matches.push(newGameInstance);
			}
			else
			{
				// Bye: player automatically advances
				const	newGameInstance =  new GameInstance(
					players[i].userId,
					null,
					players[i].username,
					null,
					GameType.TOURNAMENT,
				);

				newGameInstance.winner = { userId: players[i].userId, username: players[i].username };
				newGameInstance.status = GameStatus.FINISHED;

				matches.push(newGameInstance);
			}
		}

		// Add the matches list as a new round
		this.rounds.push(matches);
	}

	playerReady(userId)
	{
		const	currentMatches = this.rounds[this.currentRound];
		if (!currentMatches)
			return null;

		// Find the match this player is in
		for (const match of currentMatches)
		{
			if (match.status !== GameStatus.WAITING)
				continue;

			if (match.player1.userId === userId)
			{
				match.player1Ready = true;
				return (match);
			}
			else if (match.player2?.userId === userId)
			{
				match.player2Ready = true;
				return (match);
			}
		}

		return (null);
	}

	isMatchReady(matchId)
	{
		const	match = this._findMatch(matchId);
		if (!match || match.status !== GameStatus.WAITING)
			return false;

		return match.player1Ready && match.player2Ready;
	}

	setMatchInProgress(matchId, gameId)
	{
		const	match = this._findMatch(matchId);
		if (match)
		{
			match.status = GameStatus.IN_PROGRESS;
			match.gameId = gameId;
		}
	}

	setMatchWinner(matchId, winnerId)
	{
		const	match = this._findMatch(matchId);
		if (!match)
			return;

		match.status = GameStatus.FINISHED;
		match.winner = match.player1.userId === winnerId ? match.player1 : match.player2;

		// Check if this round is complete
		if (this._isRoundComplete())
		{
			this._advanceToNextRound();
		}
	}

	_isRoundComplete()
	{
		const	currentMatches = this.rounds[this.currentRound];
		if (!currentMatches)
			return (false);

		return (currentMatches.every(match => match.status === GameStatus.FINISHED));
	}

	_advanceToNextRound()
	{
		const	currentMatches = this.rounds[this.currentRound];
		const	winners = currentMatches.map(match => match.winner).filter(w => w !== null);

		// If only one winner, tournament is over
		if (winners.length === 1)
		{
			this.status = TournamentStatus.FINISHED;
			this.winner = winners[0];
			return;
		}

		// Create next round with winners
		this._createRound(winners);
		this.currentRound++;
	}

	_findMatch(matchId)
	{
		for (const round of this.rounds)
		{
			const	match = round.find(m => m.matchId === matchId);
			if (match)
				return (match);
		}

		return (null);
	}

	getCurrentMatches()
	{
		return (this.rounds[this.currentRound] || []);
	}

	getMatchForPlayer(userId)
	{
		const	currentMatches = this.getCurrentMatches();

		return (currentMatches.find(m =>  m.player1.userId === userId || m.player2?.userId === userId ) || null);
	}
}
