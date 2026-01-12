import { pongConnectionManager } from './PongConnectionManager.js';

export const	GameStatus =
{
	WAITING: 'WAITING', // Just for custom games, waiting for opponent to join
	IN_LOBBY: 'IN_LOBBY',
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
	// By defaualt, the left player is the creator
	constructor(id, playerLeftId, playerRightId, playerLeftUsername, playerRightUsername, type)
	{
		this.id = id;

		this.playerLeftId = playerLeftId;
		this.playerRightId = playerRightId;

		this.playerLeftUsername = playerLeftUsername;
		this.playerRightUsername = playerRightUsername;

		this.playerLeftReady = false;
		this.playerRightReady = false;

		// CUSTOM GAMES start in WAITING, RANDOM GAMES start in LOBBY because both players are known
		this.gameStatus = type === GameType.CUSTOM ? GameStatus.WAITING : GameStatus.IN_LOBBY;
		this.gameType = type;

		this.type = type;

		this.scores =
		{
			[playerLeftId]: 0,
			[playerRightId]: 0,
		};
	}

	startGame()
	{
		this.gameStatus = GameStatus.IN_PROGRESS;
	}

	processMove(playerId, direction)
	{
	}

	hasPlayer(playerId)
	{
		return (this.playerLeftId === playerId || this.playerRightId === playerId);
	}
}