
const	GameStatus =
{
	WAITING,
	IN_PROGRESS,
	FINISHED,
}

const	GameType =
{
	CUSTOM,
	RANDOM,
}

export class	GameInstance
{
	constructor(id, playerXId, playerOId, type)
	{
		this.id = id;
		this.playerXId = playerXId;
		this.playerOId = playerOId;

		this.playerOIdReady = false;
		this.playerXIdReady = false;

		this.gameStatus = GameStatus.WAITING;
		this.gameType = type;
	}

	startGame()
	{
		this.gameStatus = GameStatus.IN_PROGRESS;
	}
}