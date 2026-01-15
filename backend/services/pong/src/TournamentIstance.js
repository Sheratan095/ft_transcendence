export const	TournamentStatus =
{
	WAITING: 'WAITING', // Just for custom games, waiting for opponent to join
	IN_PROGRESS: 'IN_PROGRESS',
	FINISHED: 'FINISHED',
};

export class	TournamentInstance
{
	constructor(creatorId, name)
	{
		this.id = generateUniqueId();
		this.createdAt = new Date();

		this.creatorId = creatorId;
		this.name = name;

		this.status = TournamentStatus.WAITING;

		this.participants = new Set();
		this.matches = [];
	}
}


