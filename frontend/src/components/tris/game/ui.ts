/**
 * Tris UI & Renderer
 * Handles rendering the game board and updating cell symbols
 */

export class BoardRenderer {
  private boardElement: HTMLElement | null;

  constructor(boardId: string = 'tris-board') {
    this.boardElement = document.getElementById(boardId);
    if (this.boardElement) {
      this.renderBoard();
    }
  }

  /**
   * Initialize building the board grid buttons
   */
  public renderBoard() {
    if (!this.boardElement) return;

    this.boardElement.innerHTML = '';

    // Create 3x3 grid of cells
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'w-full h-full aspect-square bg-neutral-800 dark:bg-neutral-700/50 border-2 dark:border-neutral-600 hover:border-accent-green hover:bg-neutral-700 dark:hover:bg-neutral-600 transition text-4xl sm:text-5xl md:text-5xl font-extrabold text-white rounded-xl cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-accent-green/20';
      cell.dataset.index = i.toString();
      cell.id = `tris-cell-${i}`;
      this.boardElement.appendChild(cell);
    }
  }

  /**
   * Update the UI of the board based on a GameState object
   */
  public updateBoard(board: (string | null)[]) {
    board.forEach((symbol, index) => {
      this.updateCell(index, symbol || '');
    });
  }

  /**
   * Update a specific cell in the grid
   */
  public updateCell(position: number, symbol: string) {
    const cell = document.getElementById(`tris-cell-${position}`);
    if (cell) {
      cell.textContent = symbol;
      if (symbol === 'X') {
        cell.classList.add('text-[#0dff66]');
        cell.classList.remove('text-[#ff009d]');
      } else if (symbol === 'O') {
        cell.classList.add('text-[#ff009d]');
        cell.classList.remove('text-[#0dff66]');
      } else {
	// Empty cell
	cell.classList.remove('text-[#0dff66]', 'text-[#ff009d]', 'opacity-50');
	cell.textContent = '';
	return;
      }
      cell.classList.add('opacity-50');
    }
  }

  /**
   * Set the board status text (e.g., current turn, game over)
   */
  public updateStatus(statusText: string) {
    const statusEl = document.getElementById('tris-status');
    if (statusEl) {
      statusEl.textContent = statusText;
    }
  }

  /**
   * Set game ID text display
   */
  public updateGameId(gameId: string | null) {
	const gameIdEl = document.getElementById('tris-game-id');
	if (gameIdEl) {
	  gameIdEl.textContent = gameId ? `ID: ${gameId}` : '';
	}
  }

  /**
   * Enable or disable clickable state for all cells
   */
  public toggleInteraction(enable: boolean) {
	if (!this.boardElement) return;
	const cells = this.boardElement.querySelectorAll('button');
	cells.forEach(cell => {
	  if (enable) {
		cell.classList.remove('cursor-not-allowed');
		cell.classList.add('cursor-pointer');
	  } else {
		cell.classList.remove('cursor-pointer');
		cell.classList.add('cursor-not-allowed');
	  }
	});
  }
}
