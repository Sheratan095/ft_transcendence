/**
 * Generic game invite modal controller
 * Used by both Tris and Pong to display a friend list and send invites
 */

import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
import { t } from './intlayer';
import { FriendsManager } from '../components/profile/FriendsManager';

let currentGameType: 'tris' | 'pong' | null = null;
let currentCallback: ((friendId: string) => Promise<void>) | null = null;
let friendsManager: FriendsManager | null = null;

export async function openGameInviteModal(
  gameType: 'tris' | 'pong',
  onFriendSelected: (friendId: string) => Promise<void>
) {
  const modal = document.getElementById('game-invite-modal');
  const title = document.getElementById('game-invite-title');
  const subtitle = document.getElementById('game-invite-subtitle');
  const friendsList = document.getElementById('game-invite-friends-list');
  const closeBtn = document.getElementById('game-invite-close-btn');

  if (!modal || !title || !subtitle || !friendsList || !closeBtn) {
    showErrorToast(t('toast.inviteModalNotFound'));
    return;
  }

  currentGameType = gameType;
  currentCallback = onFriendSelected;

  // Update modal text based on game type
  const gameTitle = gameType === 'tris' ? 'Tris' : 'Pong';
  title.textContent = t('gameInvite.title', { game: gameTitle });
  subtitle.textContent = t('gameInvite.subtitle', { game: gameTitle });

  // Load friends if not already loaded
  if (!friendsManager) {
    friendsManager = new FriendsManager({ currentUserId: '' });
  }

  modal.classList.remove('hidden');

  // Default modal close behavior
  (closeBtn as HTMLButtonElement).onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeGameInviteModal();
  };
  (modal as HTMLElement).onclick = (e) => {
    if (e.target === modal) {
      closeGameInviteModal();
    }
  };

  try {
    friendsList.innerHTML = `<div class="dark:text-gray-400 text-gray-600 text-center py-4">${t('gameInvite.loading')}</div>`;

    const friends = await friendsManager.loadFriends();

    if (friends.length === 0) {
      friendsList.innerHTML = `<div class="dark:text-gray-400 text-gray-600 text-center py-4">${t('gameInvite.noFriends')}</div>`;
      return;
    }

    // Render friend buttons
    friendsList.innerHTML = '';
    friends.forEach((friend) => {
      const friendId = friend.id;
      const friendName = friend.username || friend.id;

      const btn = document.createElement('button');
      btn.className = `w-full p-3 text-left bg-gray-100 dark:bg-gray-800 border-2 border-gray-800 dark:border-gray-700 rounded-lg 
        hover:bg-gray-200 dark:hover:bg-gray-700 transition text-black dark:text-white font-semibold`;
      btn.textContent = friendName;
      btn.onclick = async () => {
        await selectFriend(friendId);
      };

      friendsList.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load friends:', err);
    friendsList.innerHTML = `<div class="text-red-500 text-center py-4">${t('gameInvite.loadFailed')}</div>`;
  }
}

async function selectFriend(friendId: string) {
  if (!currentCallback) return;

  try {
    await currentCallback(friendId);
    closeGameInviteModal();
  } catch (err) {
    console.error('Error inviting friend:', err);
    showErrorToast(t('toast.failedToSendInvite', { game: String(currentGameType || '') }));
  }
}

export function closeGameInviteModal() {
  const modal = document.getElementById('game-invite-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  currentGameType = null;
  currentCallback = null;
}

export default { openGameInviteModal, closeGameInviteModal };
