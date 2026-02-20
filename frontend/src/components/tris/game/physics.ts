/**
 * Tic-Tac-Toe Game Logic & Physics
 */

export interface GameState {
	board: (string | null)[];
	currentPlayer: string;
	winner: string | null;
	isGameOver: boolean;
	moveHistory: number[];
}

/**
 * Initialize a new game state
 */
export function initGameState(): GameState {
	return {
		board: Array(9).fill(null),
		currentPlayer: 'X',
		winner: null,
		isGameOver: false,
		moveHistory: []
	};
}

/**
 * Check if a move is valid
 */
export function isValidMove(gameState: GameState, position: number): boolean {
	if (position < 0 || position > 8) return false;
	if (gameState.isGameOver) return false;
	if (gameState.board[position] !== null) return false;
	return true;
}

/**
 * Apply a move to the game state
 */
export function applyMove(gameState: GameState, position: number): GameState {
	if (!isValidMove(gameState, position)) return gameState;

	const newBoard = [...gameState.board];
	newBoard[position] = gameState.currentPlayer;

	const newHistory = [...gameState.moveHistory, position];
	
	// Handle special rule if applicable (e.g. only 3 pieces per player)
	// If moveHistory for this player > 3, remove the oldest one
	if (newHistory.length > 6) {
		const oldPosition = newHistory.shift();
		if (oldPosition !== undefined) {
			newBoard[oldPosition] = null;
		}
	}

	const winner = checkWinner(newBoard);
	const isGameOver = !!winner || newBoard.every(cell => cell !== null);

	return {
		...gameState,
		board: newBoard,
		currentPlayer: gameState.currentPlayer === 'X' ? 'O' : 'X',
		winner,
		isGameOver,
		moveHistory: newHistory
	};
}

/**
 * Check for a winner
 */
export function checkWinner(board: (string | null)[]): string | null {
	const lines = [
		[0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
		[0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
		[0, 4, 8], [2, 4, 6]             // Diagonals
	];

	for (const [a, b, c] of lines) {
		if (board[a] && board[a] === board[b] && board[a] === board[c]) {
			return board[a];
		}
	}

	return null;
}

/**
 * Simple AI to find the best move
 */
export function getBestMove(gameState: GameState): number {
	// First, try to win
	const winMove = findWinningMove(gameState.board, 'O');
	if (winMove !== -1) return winMove;

	// Second, block player win
	const blockMove = findWinningMove(gameState.board, 'X');
	if (blockMove !== -1) return blockMove;

	// Third, take center
	if (gameState.board[4] === null) return 4;

	// Fourth, take corners
	const corners = [0, 2, 6, 8];
	const availableCorners = corners.filter(i => gameState.board[i] === null);
	if (availableCorners.length > 0) {
		return availableCorners[Math.floor(Math.random() * availableCorners.length)];
	}

	// Last resort, take any available spot
	const available = gameState.board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
	return available[Math.floor(Math.random() * available.length)];
}

function findWinningMove(board: (string | null)[], symbol: string): number {
	for (let i = 0; i < 9; i++) {
		if (board[i] === null) {
			const tempBoard = [...board];
			tempBoard[i] = symbol;
			if (checkWinner(tempBoard) === symbol) return i;
		}
	}
	return -1;
}
