/**
 * Generic game invite modal controller
 * Used by both Tris and Pong to display a friend list and send invites
 */

import { showErrorToast, showSuccessToast } from '../components/shared/Toast';
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
    showErrorToast('Invite modal elements not found');
    return;
  }

  currentGameType = gameType;
  currentCallback = onFriendSelected;

  // Update modal text based on game type
  const gameTitle = gameType === 'tris' ? 'Tris' : 'Pong';
  title.textContent = `Invite to ${gameTitle}`;
  subtitle.textContent = `Select a friend to invite to ${gameTitle}`;

  // Load friends if not already loaded
  if (!friendsManager) {
    friendsManager = new FriendsManager({ currentUserId: '' });
  }

  modal.classList.remove('hidden');

  try {
    friendsList.innerHTML = '<div class="dark:text-neutral-400 text-neutral-600 text-center py-4">Loading friends...</div>';

    const friends = await friendsManager.loadFriends();

    if (friends.length === 0) {
      friendsList.innerHTML = '<div class="dark:text-neutral-400 text-neutral-600 text-center py-4">No friends to invite</div>';
      return;
    }

    // Render friend buttons
    friendsList.innerHTML = '';
    friends.forEach((friend) => {
      const friendId = friend.id;
      const friendName = friend.username || friend.id;

      const btn = document.createElement('button');
      btn.className = `w-full p-3 text-left dark:bg-neutral-800 bg-neutral-200 border-2 dark:border-neutral-700 border-neutral-300 rounded-lg 
        hover:dark:bg-neutral-700 hover:bg-neutral-300 transition dark:text-white text-black font-semibold`;
      btn.textContent = friendName;
      btn.onclick = async () => {
        await selectFriend(friendId);
      };

      friendsList.appendChild(btn);
    });
  } catch (err) {
    console.error('Failed to load friends:', err);
    friendsList.innerHTML = '<div class="text-red-500 text-center py-4">Failed to load friends</div>';
  }

  // Close button handler
  closeBtn.onclick = closeGameInviteModal;

  // Close on outside click
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeGameInviteModal();
    }
  };
}

async function selectFriend(friendId: string) {
  if (!currentCallback) return;

  try {
    await currentCallback(friendId);
    closeGameInviteModal();
  } catch (err) {
    console.error('Error inviting friend:', err);
    showErrorToast(`Failed to send ${currentGameType} invite`);
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
