import { trisConnectionManager } from './TrisConnectionManager.js';

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
	constructor(id, playerXId, playerOId, playerXUsername, playerOUsername, type)
	{
		this.id = id;

		this.playerXId = playerXId;
		this.playerOId = playerOId;

		this.playerXUsername = playerXUsername;
		this.playerOUsername = playerOUsername;

		this.playerOIdReady = false;
		this.playerXIdReady = false;

		this.gameStatus = GameStatus.WAITING;
		this.gameType = type;

		this.board = Array(9).fill(null); // 3x3 board represented as a flat array
		this.turn = playerXId; // X always starts first

		this.moves = []; // To track moves for infinite tris
	}

	startGame()
	{
		this.gameStatus = GameStatus.IN_PROGRESS;
	}

	processMove(playerId, position)
	{
		// Check if position is valid
		if (!Number.isInteger(position) || position < 0 || position > 9)
		{
			console.error(`[TRIS] Invalid move position ${position} by user ${playerId}`);
			trisConnectionManager.sendInvalidMoveMessage(playerId, this.id, 'Invalid move position');
			return ;
		}

		// Check if it's the player's turn
		if (this.turn !== playerId)
		{
			console.error(`[TRIS] Not player ${playerId}'s turn in game ${this.id}`);
			trisConnectionManager.sendInvalidMoveMessage(playerId, this.id, 'Not your turn');
			return ;
		}

		// Check if position is already taken
		if (this.board[position] !== null)
			trisConnectionManager.sendInvalidMoveMessage(playerId, this.id, 'Invalid move: Position already taken');

		// Make the move
		this.board[position] = (playerId === this.playerXId) ? 'X' : 'O';

		// Switch turn
		this.turn = (this.turn === this.playerXId) ? this.playerOId : this.playerXId;

		// Remove older move for infinte tris
		this.moves.push(position);

		let	removedPosition = null;

		// MAX MARKS PER PLAYER: 3
		if (this.moves.length > process.env.TRIS_MAX_MARKS_PER_PLAYER * 2)
		{
			// Remove the oldest move and free up the position on the board
			removedPosition = this.moves.shift();
			this.board[removedPosition] = null;
		}

		const	otherPlayerId = (playerId === this.playerXId) ? this.playerOId : this.playerXId;

		// Notify both players of the move
		trisConnectionManager.sendMoveMade(playerId,  playerId, this.id,  this.board[position], position, removedPosition);
		trisConnectionManager.sendMoveMade(otherPlayerId, playerId, this.id, this.board[position], position, removedPosition);

		console.log(`[TRIS] Player ${playerId} made a move at position ${position} in game ${this.id}, removed position: ${removedPosition}`);
	}

	hasPlayer(playerId)
	{
		return (this.playerXId === playerId || this.playerOId === playerId);
	}
}