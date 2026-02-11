import type { User } from '../../lib/auth';
import { sendChatInvite } from '../../lib/chat';
import { FriendsManager } from './FriendsManager';

export interface SearchProfileCardOptions {
  onAddFriend?: (userId: string) => void;
  onBlock?: (userId: string) => void;
}

export async function renderSearchProfileCard(
  user: User,
  container: HTMLElement,
): Promise<HTMLElement | null> {

  //instantiate friends manager to check friendship status
  const loggedInUserStr = localStorage.getItem('user');
  const loggedInUser = loggedInUserStr ? JSON.parse(loggedInUserStr) : null;
  const currentUserId = loggedInUser?.id || 'current-user-id';

  const friendsManager = new FriendsManager({ currentUserId });
  await friendsManager.loadFriends();
  await friendsManager.loadFriendRequests();
  // If the user is the current user, do not render the card
  if (user.id === currentUserId) return null;

  const template = document.getElementById('search-profile-card-template') as HTMLTemplateElement | null;
  if (!template) {
    console.warn('search-profile-card-template not found, falling back to DOM creation');
    const el = document.createElement('div');
    el.textContent = user.username || user.email || 'User';
    container.appendChild(el);
    return el;
  }

  // Clone the first element child of the template content (skip text nodes)
  const templateChild = Array.from(template.content.childNodes).find(
    (node) => node.nodeType === Node.ELEMENT_NODE
  ) as HTMLElement | undefined;
  
  if (!templateChild) {
    console.warn('search-profile-card-template is empty');
    const el = document.createElement('div');
    el.textContent = 'Template error';
    container.appendChild(el);
    return el;
  }

  const cloneRoot = templateChild.cloneNode(true) as HTMLElement;

  // Populate avatar
  const avatarEl = cloneRoot.querySelector('.spc-avatar') as HTMLImageElement | null;
  if (avatarEl) {
    avatarEl.src = user.avatarUrl
      ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api${user.avatarUrl}`)
      : '/assets/placeholder-avatar.jpg';
    avatarEl.alt = user.username || 'User avatar';
  }

  // Populate text fields
  const nameEl = cloneRoot.querySelector('.spc-username') as HTMLElement | null;
  if (nameEl) nameEl.textContent = user.username || user.email || 'Unknown User';

  const emailEl = cloneRoot.querySelector('.spc-email') as HTMLElement | null;
  if (emailEl) emailEl.textContent = user.email || 'No email';

  const idEl = cloneRoot.querySelector('.spc-userid') as HTMLElement | null;
  if (idEl) idEl.textContent = `ID: ${user.id}`;

  // Stats placeholders (could be replaced with real data later)
  const friendsEl = cloneRoot.querySelector('.spc-friends') as HTMLElement | null;
  if (friendsEl) friendsEl.textContent = '0';
  const winsEl = cloneRoot.querySelector('.spc-wins') as HTMLElement | null;
  if (winsEl) winsEl.textContent = '0';
  const levelEl = cloneRoot.querySelector('.spc-level') as HTMLElement | null;
  if (levelEl) levelEl.textContent = '1';

  // Action buttons
  const chatBtn = cloneRoot.querySelector('.spc-chat') as HTMLButtonElement | null;
  if (chatBtn) {
    chatBtn.addEventListener('click', async () => {
      try {
        await sendChatInvite(user.id);
        console.log('Chat invite sent to user:', user.id);
      } catch (err) {
        console.error('Failed to send chat invite:', err);
      }
    });
  }

  const addBtn = cloneRoot.querySelector('.spc-add') as HTMLButtonElement | null;
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      try {
        const success = await friendsManager.addFriend(user.id);
        if (success) {
          addBtn.disabled = true;
          addBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
          addBtn.classList.add('bg-neutral-600', 'text-neutral-400');
          addBtn.textContent = '✓ Request Sent';
        }
      } catch (err) {
        console.error('Failed to add friend:', err);
      }
    });
  }

  const blockBtn = cloneRoot.querySelector('.spc-block') as HTMLButtonElement | null;
  if (blockBtn) {
    blockBtn.addEventListener('click', async () => {
      try {
        const success = await friendsManager.blockUser(user.id);
        if (success) {
          blockBtn.disabled = true;
          blockBtn.classList.remove('bg-red-600/70', 'hover:bg-red-700');
          blockBtn.classList.add('bg-neutral-600', 'text-neutral-400');
          blockBtn.textContent = '✓ Blocked';
        }
      } catch (err) {
        console.error('Failed to block user:', err);
      }
    });
  }

  container.appendChild(cloneRoot);
  return cloneRoot;
}
