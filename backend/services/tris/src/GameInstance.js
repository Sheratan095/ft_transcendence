

export const	GameStatus =
{
	WAITING: 'WAITING',
	IN_PROGRESS: 'IN_PROGRESS',
	FINISHED: 'FINISHED',
};

export const	GameType =
{
	CUSTOM: 'CUSTOM',
	RANDOM: 'RANDOM',
};

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