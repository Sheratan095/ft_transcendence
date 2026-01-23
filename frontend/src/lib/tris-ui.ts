import { getUserId } from './auth';
import { getUser } from './auth';
import { 
  initTris, 
  onTrisEvent, 
  makeTrisMove, 
  createCustomGame, 
  cancelCustomGame,
  setUserReady,
  quitGame,
  closeTris, 
  setCurrentGameId,
  getCurrentGameId,
  joinCustomGame
} from './tris';
import { showSuccessToast, showErrorToast } from '../components/shared/Toast';
import type { User } from './auth';
import type { FriendsManager } from '../components/profile/FriendsManager';

let trisInitialized = false;
let user: User | null = null;
let friendsManager: FriendsManager | null = null;
let gameStatus: 'lobby' | 'playing' = 'lobby';
let userReady = false;
let pendingGameJoin: string | null = null;

/**
 * Set the friends manager instance (called from main.ts)
 */
export function setTrisFriendsManager(manager: FriendsManager) {
  friendsManager = manager;
}

export async function openTrisModal() {
  console.log("tris modal");	
  const modal = document.getElementById('tris-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // Initialize tris connection if not already done
  if (!trisInitialized) {
    try {
	  setupTrisEventListeners();
      const userId = getUserId();
	  user = getUser();
      if (!userId) {
        showTrisError('User not authenticated');
		return;
      }

      await initTris(userId);
      
      // Setup WebSocket event handlers
      onTrisEvent(handleTrisEvent);
      
      trisInitialized = true;
      renderTrisBoard();
      updateTrisStatus('Ready to play');
      
      setupInviteModalListeners();

      // If there's a pending game join, join it now that tris is initialized
      if (pendingGameJoin) {
        const gameId = pendingGameJoin;
        pendingGameJoin = null;
        joinCustomGame(gameId);
      }
    } catch (err) {
      console.error('Failed to initialize tris:', err);
      showTrisError((err as Error).message || 'Failed to connect to tris service');
    }
  }
}

export function closeTrisModal() {
  const modal = document.getElementById('tris-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  if (trisInitialized) {
    closeTris();
    trisInitialized = false;
  }
}

export async function openTrisModalAndJoinGame(gameId: string) {
  pendingGameJoin = gameId;
  if (!trisInitialized || !getCurrentGameId() || WebSocket) {
	await openTrisModal();
	return;
  }
  joinCustomGame(gameId);
}

function renderTrisBoard() {
  const board = document.getElementById('tris-board');
  if (!board) return;

  board.innerHTML = '';

  // Create 3x3 grid of cells
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'w-full aspect-square bg-neutral-800 border-2 border-neutral-700 hover:border-[#0dff66] transition text-2xl font-extrabold text-white hover:bg-neutral-700 cursor-pointer';
    cell.dataset.index = i.toString();
    cell.id = `tris-cell-${i}`;
    cell.addEventListener('click', () => handleCellClick(i));
    board.appendChild(cell);
  }
}

function handleCellClick(index: number) {
  makeTrisMove(index);
}

function setupTrisEventListeners() {
  // Setup button listeners
  const startBtn = document.getElementById('tris-start-btn');
  const surrenderBtn = document.getElementById('tris-surrender-btn');
  const resetBtn = document.getElementById('tris-reset-btn');
  const inviteBtn = document.getElementById('tris-invite-btn');
  const closeBtn = document.getElementById('tris-close-btn');

  if (startBtn) startBtn.addEventListener('click', () => {
    const gameId = getCurrentGameId();
    if (gameStatus === 'lobby' && gameId) {
      // In lobby - act as ready button
      userReady = !userReady;
      setUserReady(userReady);
      const btnText = userReady ? '✓ Ready' : 'Ready';
      startBtn.textContent = btnText;
      const status = userReady ? 'You are ready!' : 'You are not ready';
      showSuccessToast(status);
    } else {
      // Not in game - start looking for a match
	  
	}
  });
  if (surrenderBtn) surrenderBtn.addEventListener('click', () => {
    const gameId = getCurrentGameId();
    if (gameStatus === 'lobby' && gameId) {
      cancelCustomGame(gameId);
      showErrorToast('Game canceled');
    } else {
      quitGame();
      showErrorToast('You quit the game');
    }
  });
  if (resetBtn) resetBtn.addEventListener('click', () => location.reload());
  if (inviteBtn) inviteBtn.addEventListener('click', () => openInviteModal());
  if (closeBtn) closeBtn.addEventListener('click', () => closeTrisModal());
}

/**
 * Handle incoming WebSocket events from tris server
 */
function handleTrisEvent(event: string, data: any) {
  console.log('Tris event:', event, data);

  switch (event) {
    case 'tris.customGameCreated':
      handleCustomGameCreated(data);
      break;
    case 'tris.customGameJoinSuccess':
      handleCustomGameJoinSuccess(data);
      break;
    case 'tris.playerJoinedCustomGame':
      handlePlayerJoinedCustomGame(data);
      break;
    case 'tris.customGameCanceled':
      handleCustomGameCanceled(data);
      break;
    case 'tris.gameStarted':
      handleGameStarted(data);
      break;
    case 'tris.moveMade':
      handleMoveMade(data);
      break;
    case 'tris.gameEnded':
      handleGameEnded(data);
      break;
    case 'tris.playerQuitCustomGameInLobby':
      handlePlayerQuitCustomGameInLobby(data);
      break;
    case 'tris.matchedInRandomGame':
      handleMatchedInRandomGame(data);
      break;
    case 'invalidMove':
      handleInvalidMove(data);
      break;
    case 'error':
      handleError(data);
      break;
    default:
      console.warn('Unknown tris event:', event);
  }
}

function handleCustomGameCreated(data: any) {
  const { gameId, otherUsername } = data;
  setCurrentGameId(gameId);
  updateGameIdDisplay(gameId);
  updateTrisStatus(`Game created! Waiting for ${otherUsername}...`);
  showSuccessToast(`Game created! Waiting for ${otherUsername}...`);
}

function handleCustomGameJoinSuccess(data: any) {
  const { gameId, otherUsername } = data;
  console.log('Joined custom game:', data);
  setCurrentGameId(gameId);
  updateGameIdDisplay(gameId);
  updateTrisStatus(`Joined game! Playing against ${otherUsername}`);
  showSuccessToast(`Joined game with ${otherUsername}!`);
  closeInviteModal();
}

function handlePlayerJoinedCustomGame(_data: any) {
  updateTrisStatus('Opponent joined! Ready to start');
  showSuccessToast('Opponent joined the game!');
}

function handleCustomGameCanceled(_data: any) {
  updateTrisStatus('Game was canceled');
  showErrorToast('Game was canceled');
  gameStatus = 'lobby';
  userReady = false;
  updateGameIdDisplay(null);
  setCurrentGameId(null);
  // Update button text back to default
  const startBtn = document.getElementById('tris-start-btn');
  if (startBtn) startBtn.textContent = 'Start Game';
}

function handleGameStarted(data: any) {
  const { gameId, yourSymbol, opponentUsername, yourTurn } = data;
  setCurrentGameId(gameId);
  gameStatus = 'playing';
  userReady = false;
  const turnText = yourTurn ? 'Your turn' : `${opponentUsername}'s turn`;
  updateTrisStatus(`Game started! You are ${yourSymbol}. ${turnText}`);
  showSuccessToast(`Game started! You are ${yourSymbol}`);
  renderTrisBoard();
  // Update button text back to default
  const startBtn = document.getElementById('tris-start-btn');
  if (startBtn) startBtn.textContent = 'Start Game';
}

function handleMoveMade(data: any) {
  const { symbol, position, moveMakerId, removedPosition } = data;
  updateBoardPosition(position, symbol);
  if (removedPosition !== null && removedPosition !== undefined) {
	// Clear removed position
	updateBoardPosition(removedPosition, '');	
}	
  const status = moveMakerId === user?.id ? 'Your turn' : 'Opponent\'s turn';
  updateTrisStatus(status);
}

function handleGameEnded(data: any) {
  const { winner, quit, timedOut } = data;
  let message = '';
  
  if (quit) {
    message = 'Opponent quit the game';
  } else if (timedOut) {
    message = 'Game ended - Move timeout';
  } else if (winner === user?.id) {
    message = 'You won!';
  } else {
    message = 'You lost!';
  }
  
  updateTrisStatus(message);
  gameStatus = 'lobby';
  userReady = false;
  if (quit || timedOut) {
    showErrorToast(message);
  } else if (winner === user?.id) {
    showSuccessToast(message);
  } else {
    showErrorToast(message);
  }
  updateGameIdDisplay(null);
  setCurrentGameId(null);
  // Update button text back to default
  const startBtn = document.getElementById('tris-start-btn');
  if (startBtn) startBtn.textContent = 'Start Game';
}

function handlePlayerQuitCustomGameInLobby(_data: any) {
  updateTrisStatus('Opponent quit the lobby');
  showErrorToast('Opponent quit the game');
  gameStatus = 'lobby';
  userReady = false;
  updateGameIdDisplay(null);
  setCurrentGameId(null);
  // Update button text back to default
  const startBtn = document.getElementById('tris-start-btn');
  if (startBtn) startBtn.textContent = 'Start Game';
}

function handleMatchedInRandomGame(data: any) {
  const { gameId, yourSymbol, opponentUsername, yourTurn } = data;
  setCurrentGameId(gameId);
  const turnText = yourTurn ? 'Your turn' : `${opponentUsername}'s turn`;
  updateTrisStatus(`Matched! Playing ${opponentUsername}. You are ${yourSymbol}. ${turnText}`);
  showSuccessToast(`Matched with ${opponentUsername}!`);
}

function handleInvalidMove(data: any) {
  const { message } = data;
  updateTrisStatus(`Invalid move: ${message}`);
  showErrorToast(`Invalid move: ${message}`);
}

function handleError(data: any) {
  const { message } = data;
  updateTrisStatus(`Error: ${message}`);
  showErrorToast(`Error: ${message}`);
}

function updateBoardPosition(position: number, symbol: string) {
  const cell = document.getElementById(`tris-cell-${position}`);
  if (cell) {
    cell.textContent = symbol;
    if (symbol === 'X') {
      cell.classList.add('text-[#0dff66]');
      cell.classList.remove('text-[#ff009d]');
    } else if (symbol === 'O') {
      cell.classList.add('text-[#ff009d]');
      cell.classList.remove('text-[#0dff66]');
    }
    cell.classList.add('opacity-50');
  }
}

function updateTrisStatus(statusText: string) {
  const statusEl = document.getElementById('tris-status');
  if (!statusEl) return;
  statusEl.textContent = statusText;
}

function updateGameIdDisplay(gameId: string | null) {
  const gameIdEl = document.getElementById('tris-game-id');
  if (!gameIdEl) return;
  gameIdEl.textContent = gameId ? `ID: ${gameId}` : '';
}

function showTrisError(message: string) {
  const errorEl = document.getElementById('tris-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => {
      errorEl.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Setup the tris card button click handler
 */
export function setupTrisCardListener() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      attachTrisCardListener();
    });
  } else {
    attachTrisCardListener();
  }
}

function attachTrisCardListener() {
  const trisCard = document.getElementById('tris-card-btn');
  if (!trisCard) {
    console.error('Tris card button not found');
    return;
  }
  console.log('Attaching tris card listener');
  trisCard.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Tris card clicked');
    openTrisModal();
  });
}

/**
 * Open invite modal to select a friend to invite
 */
async function openInviteModal() {
  const inviteModal = document.getElementById('tris-invite-modal');
  if (!inviteModal) return;

  inviteModal.classList.remove('hidden');

  try {
    if (!friendsManager) {
      showErrorToast('Friends manager not initialized');
      return;
    }

    // Load friends from manager
    const friends = friendsManager.getFriends();
    renderFriendsList(friends);
  } catch (err) {
    showErrorToast((err as Error).message || 'Failed to load friends');
  }
}

function closeInviteModal() {
  const inviteModal = document.getElementById('tris-invite-modal');
  if (inviteModal) {
    inviteModal.classList.add('hidden');
  }
}

/**
 * Setup invite modal button listeners
 */
function setupInviteModalListeners() {
  const inviteCloseBtn = document.getElementById('tris-invite-close-btn');
  if (inviteCloseBtn) {
    inviteCloseBtn.addEventListener('click', () => closeInviteModal());
  }
}

function renderFriendsList(friends: User[]) {
  const friendsList = document.getElementById('tris-friends-list');
  if (!friendsList) return;

  friendsList.innerHTML = '';

  if (friends.length === 0) {
    friendsList.innerHTML = '<div class="text-neutral-400 text-center py-4">No friends to invite</div>';
    return;
  }

  friends.forEach((friend) => {
    const button = document.createElement('button');
    button.className = 'w-full p-3 text-left bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-700 hover:border-[#0dff66] transition text-white font-semibold rounded';
    button.textContent = friend.username || `User #${friend.id}`;
    button.addEventListener('click', () => inviteFriend(friend));
    friendsList.appendChild(button);
  });
}

async function inviteFriend(friend: User) {
  try {
	if (gameStatus === 'playing') {
		showErrorToast('Cannot invite while in a game');
		return;
	}
	if (!friend.id) {
	  showErrorToast('Invalid friend selected');
	  return;
	}
	if (gameStatus === 'lobby') {
		const currentGameId = getCurrentGameId();
		if (currentGameId) {
			cancelCustomGame(currentGameId);
		}
	}
    // Create a custom game with this friend
    createCustomGame(friend.id);
	console.log('Inviting friend:', friend);
    showSuccessToast(`Inviting ${friend.username}...`);
    closeInviteModal();
  } catch (err) {
    showErrorToast((err as Error).message || 'Failed to send invitation');
  }
}
