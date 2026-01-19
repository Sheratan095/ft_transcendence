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
}
