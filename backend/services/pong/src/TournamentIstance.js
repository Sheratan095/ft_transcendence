export const	TournamentStatus =
{
	WAITING: 'WAITING', // Just for custom games, waiting for opponent to join
	IN_PROGRESS: 'IN_PROGRESS',
	FINISHED: 'FINISHED',
};

export class	TournamentInstance
{
	constructor(name, creatorId, creatorUsername)
	{
		this.id = generateUniqueId();
		this.createdAt = new Date();

		this.name = name;

		this.creatorId = creatorId;
		this.creatorUsername = creatorUsername;
		this.addParticipant(creatorId, creatorUsername);

		this.status = TournamentStatus.WAITING;

		this.participants = new Set(); // id of participants and usernames
		this.matches = [];
	}

	addParticipant(userId, username)
	{
		this.participants.add({ id: userId, username: username });
	}
}
