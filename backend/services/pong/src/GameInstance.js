import { pongConnectionManager } from './PongConnectionManager.js';
import { checkWin } from './pong-help.js';

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
	constructor(id, player1Id, player2Id, player1Username, player2Username, type)
	{
		this.id = id;

		this.player1Id = player1Id;
		this.player2Id = player2Id;

	}

	startGame()
	{
		this.gameStatus = GameStatus.IN_PROGRESS;
	}

	processMove(playerId, position)
	{
	}

	hasPlayer(playerId)
	{
		return (this.player1Id === playerId || this.player2Id === playerId);
	}
}