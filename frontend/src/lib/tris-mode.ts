/**
 * Tris Mode Selection Manager
 * Handles the mode selection modal and initializes game with appropriate mode
 */

import { showSuccessToast, showErrorToast } from '../components/shared/Toast';
import { openTrisModal } from './tris-ui';

export type TrisModeType = 'online' | 'offline-1v1' | 'offline-ai';

let selectedMode: TrisModeType | null = null;
let modeSelectionCallback: ((mode: TrisModeType) => Promise<void>) | null = null;

/**
 * Open the mode selection modal
 */
export function openTrisModeModal(onModeSelected?: (mode: TrisModeType) => Promise<void>) {
  const modeModal = document.getElementById('tris-mode-modal');
  if (!modeModal) {
    console.error('Tris mode modal not found');
    return;
  }

  modeSelectionCallback = onModeSelected || null;
  modeModal.classList.remove('hidden');
  setupModeSelectionListeners();
}

/**
 * Close the mode selection modal
 */
export function closeTrisModeModal() {
  const modeModal = document.getElementById('tris-mode-modal');
  if (modeModal) {
    modeModal.classList.add('hidden');
  }
}

/**
 * Get the currently selected mode
 */
export function getSelectedTrisMode(): TrisModeType | null {
  return selectedMode;
}

/**
 * Set up event listeners for mode selection buttons
 */
function setupModeSelectionListeners() {
  const onlineBtn = document.getElementById('tris-mode-online');
  const offline1v1Btn = document.getElementById('tris-mode-offline-1v1');
  const offlineAiBtn = document.getElementById('tris-mode-offline-ai');
  const closeBtn = document.getElementById('tris-mode-close-btn');

  // Remove old listeners by cloning
  if (onlineBtn) {
    const newOnlineBtn = onlineBtn.cloneNode(true) as HTMLButtonElement;
    onlineBtn.replaceWith(newOnlineBtn);
  }
  if (offline1v1Btn) {
    const newOffline1v1Btn = offline1v1Btn.cloneNode(true) as HTMLButtonElement;
    offline1v1Btn.replaceWith(newOffline1v1Btn);
  }
  if (offlineAiBtn) {
    const newOfflineAiBtn = offlineAiBtn.cloneNode(true) as HTMLButtonElement;
    offlineAiBtn.replaceWith(newOfflineAiBtn);
  }
  if (closeBtn) {
    const newCloseBtn = closeBtn.cloneNode(true) as HTMLButtonElement;
    closeBtn.replaceWith(newCloseBtn);
  }

  // Get fresh references
  const freshOnlineBtn = document.getElementById('tris-mode-online') as HTMLButtonElement | null;
  const freshOffline1v1Btn = document.getElementById('tris-mode-offline-1v1') as HTMLButtonElement | null;
  const freshOfflineAiBtn = document.getElementById('tris-mode-offline-ai') as HTMLButtonElement | null;
  const freshCloseBtn = document.getElementById('tris-mode-close-btn') as HTMLButtonElement | null;

  if (freshOnlineBtn) {
    freshOnlineBtn.addEventListener('click', () => selectMode('online'));
  }
  if (freshOffline1v1Btn) {
    freshOffline1v1Btn.addEventListener('click', () => selectMode('offline-1v1'));
  }
  if (freshOfflineAiBtn) {
    freshOfflineAiBtn.addEventListener('click', () => selectMode('offline-ai'));
  }
  if (freshCloseBtn) {
    freshCloseBtn.addEventListener('click', closeTrisModeModal);
  }

  // Close modal when clicking outside
  const modeModal = document.getElementById('tris-mode-modal');
  if (modeModal) {
    modeModal.addEventListener('click', (e) => {
      if (e.target === modeModal) {
        closeTrisModeModal();
      }
    });
  }
}

/**
 * Handle mode selection
 */
async function selectMode(mode: TrisModeType) {
  selectedMode = mode;
  closeTrisModeModal();

  try {
    // If there's a custom callback, use it
    if (modeSelectionCallback) {
      await modeSelectionCallback(mode);
    } else {
      // Default behavior: show tris modal with mode-specific functions
      await handleModeSelection(mode);
    }
  } catch (err) {
    console.error('Error selecting mode:', err);
    showErrorToast('Failed to start game mode');
  }
}

/**
 * Default handler for mode selection
 */
async function handleModeSelection(mode: TrisModeType) {
  const modeNames: Record<TrisModeType, string> = {
    'online': 'Online Matchmaking',
    'offline-1v1': 'Offline 1v1',
    'offline-ai': 'Offline vs Bot'
  };

  showSuccessToast(`Selected: ${modeNames[mode]}`);

  // Open the tris modal to play the game
  await openTrisModal();

  // Initialize mode-specific behaviors
  initializeModeSpecificBehaviors(mode);
}

/**
 * Initialize mode-specific game behaviors
 */
export function initializeModeSpecificBehaviors(mode: TrisModeType) {
  // const startBtn = document.getElementById('tris-start-btn') as HTMLButtonElement | null;
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;
  const statusDiv = document.getElementById('tris-status') as HTMLDivElement | null;

  // Mode-specific UI adjustments
  switch (mode) {
    case 'online':
      // Online mode keeps default behavior
      if (inviteBtn) {
        inviteBtn.style.display = 'block';
      }
      if (statusDiv) {
        statusDiv.textContent = 'Looking for an opponent...';
      }
      break;

    case 'offline-1v1':
      // Offline 1v1 mode
      if (inviteBtn) {
        inviteBtn.style.display = 'none';
      }
      if (statusDiv) {
        statusDiv.textContent = 'Player 1 (X) vs Player 2 (O) - Player 1 to start';
      }
      // Disable online features
      disableOnlineFeatures();
      initOffline1v1Mode();
      break;

    case 'offline-ai':
      // Offline AI mode
      if (inviteBtn) {
        inviteBtn.style.display = 'none';
      }
      if (statusDiv) {
        statusDiv.textContent = 'You (X) vs AI (O)';
      }
      // Disable online features
      disableOnlineFeatures();
      initOfflineAIMode();
      break;
  }
}

/**
 * Disable online-specific features for offline modes
 */
function disableOnlineFeatures() {
  const inviteBtn = document.getElementById('tris-invite-btn') as HTMLButtonElement | null;
  if (inviteBtn) {
    inviteBtn.disabled = true;
    inviteBtn.style.opacity = '0.5';
    inviteBtn.style.cursor = 'not-allowed';
  }
}

/**
 * Initialize offline 1v1 mode
 */
function initOffline1v1Mode() {
  console.log('Initializing Offline 1v1 mode');
  
  // Set up turn tracking for local two-player game
  const gameState = {
    currentPlayer: 'X',
    board: Array(9).fill(''),
    gameActive: true,
    moveHistory: {
      X: [] as number[],  // Track positions of X's moves in order
      O: [] as number[]   // Track positions of O's moves in order
    }
  };

  // Store in window for access in cell click handlers
  (window as any).trisGameState = gameState;

  // Override the makeTrisMove function to work locally
  setupLocal1v1Handler();
}

/**
 * Initialize offline AI mode
 */
function initOfflineAIMode() {
  console.log('Initializing Offline AI mode');

  const gameState = {
    currentPlayer: 'X', // Player is X
    board: Array(9).fill(''),
    gameActive: true,
    moveHistory: {
      X: [] as number[],  // Track positions of player's moves in order
      O: [] as number[]   // Track positions of AI's moves in order
    }
  };

  (window as any).trisGameState = gameState;
  setupLocalAIHandler();
}

/**
 * Set up local 1v1 game handler
 */
function setupLocal1v1Handler() {
  const cells = document.querySelectorAll('[id^="tris-cell-"]');
  const statusDiv = document.getElementById('tris-status') as HTMLDivElement | null;

  cells.forEach((cell: Element) => {
    const button = cell as HTMLButtonElement;
    // Clear existing listeners
    const newButton = button.cloneNode(true) as HTMLButtonElement;
    button.replaceWith(newButton);

    const index = parseInt(newButton.id.replace('tris-cell-', ''), 10);
    newButton.addEventListener('click', () => handleLocal1v1Move(index, statusDiv));
  });
}

/**
 * Handle local 1v1 move
 */
function handleLocal1v1Move(index: number, statusDiv: HTMLDivElement | null) {
  const gameState = (window as any).trisGameState;
  if (!gameState || !gameState.gameActive) return;

  const cell = document.getElementById(`tris-cell-${index}`) as HTMLButtonElement | null;
  if (!cell || cell.textContent) return; // Cell already occupied

  // Track the move
  gameState.moveHistory[gameState.currentPlayer].push(index);

  // Make the move
  gameState.board[index] = gameState.currentPlayer;
  cell.textContent = gameState.currentPlayer;
  cell.style.color = gameState.currentPlayer === 'X' ? '#0dff66' : '#00ffff';

  // Check if this is the 4th move for this player, and remove the oldest move
  if (gameState.moveHistory[gameState.currentPlayer].length > 3) {
    const oldestMoveIndex = gameState.moveHistory[gameState.currentPlayer].shift();
    const oldestCell = document.getElementById(`tris-cell-${oldestMoveIndex}`) as HTMLButtonElement | null;
    if (oldestCell) {
      // Change color to light red before removing
      oldestCell.style.color = '#ff6b6b';
      // Remove after a brief delay for visual effect
      setTimeout(() => {
        oldestCell.textContent = '';
        oldestCell.style.color = 'white';
        gameState.board[oldestMoveIndex] = '';
      }, 300);
    }
  }

  // Check for winner
  const winner = checkWinner(gameState.board);
  if (winner) {
    gameState.gameActive = false;
    if (statusDiv) {
      statusDiv.textContent = `🎉 Player ${winner} wins!`;
      statusDiv.classList.add('text-[#0dff66]');
    }
    return;
  }

  // Check for draw
  if (gameState.board.every((cell: string) => cell !== '')) {
    gameState.gameActive = false;
    if (statusDiv) {
      statusDiv.textContent = "It's a draw!";
      statusDiv.classList.add('text-yellow-500');
    }
    return;
  }

  // Switch player
  gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
  if (statusDiv) {
    statusDiv.textContent = `Player ${gameState.currentPlayer === 'X' ? '1' : '2'}'s turn (${gameState.currentPlayer})`;
  }
}

/**
 * Set up local AI game handler
 */
function setupLocalAIHandler() {
  const cells = document.querySelectorAll('[id^="tris-cell-"]');
  const statusDiv = document.getElementById('tris-status') as HTMLDivElement | null;

  cells.forEach((cell: Element) => {
    const button = cell as HTMLButtonElement;
    // Clear existing listeners
    const newButton = button.cloneNode(true) as HTMLButtonElement;
    button.replaceWith(newButton);

    const index = parseInt(newButton.id.replace('tris-cell-', ''), 10);
    newButton.addEventListener('click', () => handleLocalAIMove(index, statusDiv));
  });
}

/**
 * Handle local AI move
 */
async function handleLocalAIMove(index: number, statusDiv: HTMLDivElement | null) {
  const gameState = (window as any).trisGameState;
  if (!gameState || !gameState.gameActive || gameState.currentPlayer !== 'X') return;

  const cell = document.getElementById(`tris-cell-${index}`) as HTMLButtonElement | null;
  if (!cell || cell.textContent) return; // Cell already occupied

  // Track player's move
  gameState.moveHistory['X'].push(index);

  // Player move
  gameState.board[index] = 'X';
  cell.textContent = 'X';
  cell.style.color = '#0dff66';

  // Check if this is the 4th move for player, and remove the oldest move
  if (gameState.moveHistory['X'].length > 3) {
    const oldestMoveIndex = gameState.moveHistory['X'].shift();
    const oldestCell = document.getElementById(`tris-cell-${oldestMoveIndex}`) as HTMLButtonElement | null;
    if (oldestCell) {
      // Change color to light red before removing
      oldestCell.style.color = '#ff6b6b';
      // Remove after a brief delay for visual effect
      setTimeout(() => {
        oldestCell.textContent = '';
        oldestCell.style.color = 'white';
        gameState.board[oldestMoveIndex] = '';
      }, 300);
    }
  }

  // Check for player win
  const winner = checkWinner(gameState.board);
  if (winner) {
    gameState.gameActive = false;
    if (statusDiv) {
      statusDiv.textContent = `🎉 You win!`;
      statusDiv.classList.add('text-[#0dff66]');
    }
    return;
  }

  // Check for draw
  if (gameState.board.every((cell: string) => cell !== '')) {
    gameState.gameActive = false;
    if (statusDiv) {
      statusDiv.textContent = "It's a draw!";
      statusDiv.classList.add('text-yellow-500');
    }
    return;
  }

  // AI move - add a small delay for better UX
  if (statusDiv) {
    statusDiv.textContent = 'AI is thinking...';
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const aiMoveIndex = getBestAIMove(gameState.board);
  if (aiMoveIndex !== -1) {
    // Track AI's move
    gameState.moveHistory['O'].push(aiMoveIndex);

    gameState.board[aiMoveIndex] = 'O';
    const aiCell = document.getElementById(`tris-cell-${aiMoveIndex}`) as HTMLButtonElement | null;
    if (aiCell) {
      aiCell.textContent = 'O';
      aiCell.style.color = '#00ffff';
    }

    // Check if this is the 4th move for AI, and remove the oldest move
    if (gameState.moveHistory['O'].length > 3) {
      const oldestMoveIndex = gameState.moveHistory['O'].shift();
      const oldestCell = document.getElementById(`tris-cell-${oldestMoveIndex}`) as HTMLButtonElement | null;
      if (oldestCell) {
        // Change color to light red before removing
        oldestCell.style.color = '#ff6b6b';
        // Remove after a brief delay for visual effect
        setTimeout(() => {
          oldestCell.textContent = '';
          oldestCell.style.color = 'white';
          gameState.board[oldestMoveIndex] = '';
        }, 300);
      }
    }

    // Check for AI win
    const aiWinner = checkWinner(gameState.board);
    if (aiWinner) {
      gameState.gameActive = false;
      if (statusDiv) {
        statusDiv.textContent = `AI wins! Better luck next time.`;
        statusDiv.classList.add('text-[#00ffff]');
      }
      return;
    }

    // Check for draw
    if (gameState.board.every((cell: string) => cell !== '')) {
      gameState.gameActive = false;
      if (statusDiv) {
        statusDiv.textContent = "It's a draw!";
        statusDiv.classList.add('text-yellow-500');
      }
      return;
    }
  }

  if (statusDiv) {
    statusDiv.textContent = 'Your turn (X)';
  }
}

/**
 * Get best AI move using minimax algorithm
 */
function getBestAIMove(board: string[]): number {
  const availableMoves = board
    .map((cell, index) => (cell === '' ? index : -1))
    .filter((index) => index !== -1);

  if (availableMoves.length === 0) return -1;

  let bestScore = -Infinity;
  let bestMove = availableMoves[0];

  for (const move of availableMoves) {
    const testBoard = [...board];
    testBoard[move] = 'O';
    const score = minimax(testBoard, 0, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Minimax algorithm for AI
 */
function minimax(board: string[], depth: number, isMaximizing: boolean): number {
  const winner = checkWinner(board);

  if (winner === 'O') return 10 - depth; // AI win
  if (winner === 'X') return depth - 10; // Player win
  if (board.every((cell) => cell !== '')) return 0; // Draw

  if (isMaximizing) {
    let bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'O';
        const score = minimax(board, depth + 1, false);
        board[i] = '';
        bestScore = Math.max(score, bestScore);
      }
    }
    return bestScore;
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = 'X';
        const score = minimax(board, depth + 1, true);
        board[i] = '';
        bestScore = Math.min(score, bestScore);
      }
    }
    return bestScore;
  }
}

/**
 * Check for winner
 */
function checkWinner(board: string[]): string | null {
  const winningCombinations = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const [a, b, c] of winningCombinations) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

/**
 * Reset game for local modes
 */
export function resetLocalGame() {
  const gameState = (window as any).trisGameState;
  if (!gameState) return;

  gameState.board = Array(9).fill('');
  gameState.currentPlayer = 'X';
  gameState.gameActive = true;
  gameState.moveHistory = {
    X: [] as number[],
    O: [] as number[]
  };

  const cells = document.querySelectorAll('[id^="tris-cell-"]');
  cells.forEach((cell: Element) => {
    const button = cell as HTMLButtonElement;
    button.textContent = '';
    button.style.color = 'white';
  });

  const statusDiv = document.getElementById('tris-status') as HTMLDivElement | null;
  if (statusDiv) {
    const mode = selectedMode;
    if (mode === 'offline-1v1') {
      statusDiv.textContent = 'Player 1 (X) vs Player 2 (O) - Player 1 to start';
    } else if (mode === 'offline-ai') {
      statusDiv.textContent = 'You (X) vs AI (O)';
    }
    statusDiv.classList.remove('text-[#0dff66]', 'text-[#00ffff]', 'text-yellow-500');
  }
}
