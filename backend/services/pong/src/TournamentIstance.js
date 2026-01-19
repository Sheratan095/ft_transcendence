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
		this.matches = [];
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

		// Create initial matches
		for (let i = 0; i < shuffledParticipants.length; i += 2)
		{
			// Pair participants into matches
			if (i + 1 < shuffledParticipants.length)
			{
				this.matches.push({
					player1: shuffledParticipants[i],
					player2: shuffledParticipants[i + 1],
					winner: null,
				});
			}
			else
			{
				// If the number of players in the tournament is odd, one player does not play in that round and
				// automatically advances to the next round (a bye)
				this.matches.push({
					player1: shuffledParticipants[i],
					player2: null,
					winner: shuffledParticipants[i],
				});
			}
		}
	}
}
