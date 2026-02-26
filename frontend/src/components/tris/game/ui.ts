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
      cell.className = 'w-full h-full aspect-square border-neutral-400 bg-neutral-200 dark:bg-neutral-800 border-2 hover:bg-neutral-300 \
      dark:border-neutral-600 hover:border-accent-orange dark:hover:border-accent-green dark:hover:bg-neutral-700 transition text-4xl \
      sm:text-5xl md:text-5xl font-extrabold dark:text-white text-black rounded-xl cursor-not-allowed shadow-md hover:shadow-lg hover:shadow-accent-orange dark:hover:shadow-accent-green/20';
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
    const cell = document.getElementById(`tris-cell-${position}`) as HTMLButtonElement | null;
    if (cell) {
      cell.textContent = symbol;
      if (symbol === 'X') {
        cell.classList.add('text-[#0dff66]');
        cell.classList.remove('text-[#ff009d]');
        cell.disabled = true;
        cell.classList.remove('cursor-pointer');
        cell.classList.add('cursor-not-allowed');
      } else if (symbol === 'O') {
        cell.classList.add('text-[#ff009d]');
        cell.classList.remove('text-[#0dff66]');
        cell.disabled = true;
        cell.classList.remove('cursor-pointer');
        cell.classList.add('cursor-not-allowed');
      } else {
	// Empty cell
  // Empty cell — fully reset visual state so toggleInteraction works reliably
  cell.classList.remove('text-[#0dff66]', 'text-[#ff009d]', 'opacity-50');
  cell.textContent = '';
  cell.disabled = false;
  cell.classList.remove('cursor-not-allowed');
  cell.classList.add('cursor-pointer');
  cell.removeAttribute('aria-pressed');
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
	  const btn = cell as HTMLButtonElement;
	  // Never re-enable a cell that already has a symbol placed
	  const isFilled = !!btn.textContent?.trim();
	  if (enable && !isFilled) {
		btn.disabled = false;
		btn.classList.remove('cursor-not-allowed');
		btn.classList.add('cursor-pointer');
	  } else {
		btn.disabled = true;
		btn.classList.remove('cursor-pointer');
		btn.classList.add('cursor-not-allowed');
	  }
	});
  }
}
