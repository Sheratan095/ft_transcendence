
const	GameStatus =
{
	WAITING,
	IN_PROGRESS,
	FINISHED,
}

export class	GameInstance
{
	constructor(id, playerXId, playerOId)
	{
		this.id = id;
		this.playerXId = playerXId;
		this.playerOId = playerOId;

		this.gameStatus = GameStatus.WAITING;
	}
}