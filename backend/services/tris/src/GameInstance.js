import { trisConnectionManager } from './TrisConnectionManager.js';
import { checkWin } from './tris-help.js';

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

		this.playerOReady = false;
		this.playerXReady = false;

		this.gameStatus = GameStatus.WAITING;
		this.gameType = type;

		this.board = Array(9).fill(null); // 3x3 board represented as a flat array
		this.turn = playerXId; // X always starts first

		// To track moves for infinite tris (with removal of oldest marks)
		this.movesX = [];
		this.movesO = [];

		this.MAX_MARKS = Number(process.env.TRIS_MAX_MARKS_PER_PLAYER ?? 3);
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
		{
			trisConnectionManager.sendInvalidMoveMessage(playerId, this.id, 'Invalid move: Position already taken');
			console.error(`[TRIS] Position ${position} already taken in game ${this.id} by user ${playerId}`);
			return ;
		}

		const	playerMoves = playerId === this.playerXId ? this.movesX : this.movesO

		// Make the move
		this.board[position] = (playerId === this.playerXId) ? 'X' : 'O';
		playerMoves.push(position);

		let	removedPosition = null;

		// MAX MARKS PER PLAYER: 3
		if (playerMoves.length > this.MAX_MARKS)
		{
			// Remove the oldest move and free up the position on the board
			removedPosition = playerMoves.shift();
			console.log(`[TRIS] Removing oldest mark at position ${removedPosition} for player ${playerId} in game ${this.id}`);
			this.board[removedPosition] = null;
		}

		// Check for win is done only after adding the new move and possibly removing the oldest one
		const	winner = checkWin(this.board);
		if (winner == 'X' || winner == 'O')
		{
			this.gameStatus = GameStatus.FINISHED;
			const	winnerId = (winner === 'X') ? this.playerXId : this.playerOId;
			const	loserId = (winner === 'X') ? this.playerOId : this.playerXId;

			console.log(`[TRIS] Game ${this.id} won by player ${winnerId}`);

			return ({ winner: winnerId, loser: loserId });
		}

		// Switch turn
		this.turn = (this.turn === this.playerXId) ? this.playerOId : this.playerXId;

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