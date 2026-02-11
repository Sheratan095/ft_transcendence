import type { User } from '../../lib/auth';
import { sendChatInvite } from '../chat/chat';
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
  const friendsManager = new FriendsManager({ currentUserId: 'current-user-id' });
  await friendsManager.loadFriends();
  await friendsManager.loadFriendRequests();

  

  // If the user is the current user, do not render the card
  if (user.id === 'current-user-id') {
    return null;
  }

  // Create card container
  const card = document.createElement('div');
  card.className = 'w-full max-w-2xl mx-auto p-8 bg-neutral-800 border-2 border-neutral-700 rounded-lg shadow-lg';

  // Header with avatar
  const header = document.createElement('div');
  header.className = 'flex gap-6 mb-8';

  // Avatar
  const avatarContainer = document.createElement('div');
  avatarContainer.className = 'flex-shrink-0';

  const avatar = document.createElement('img');
  avatar.src = user.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `/api${user.avatarUrl}`)
    : '/assets/placeholder-avatar.jpg';
  avatar.alt = user.username || 'User avatar';
  avatar.className = 'w-32 h-32 rounded-lg object-cover border-2 border-neutral-600';
  avatarContainer.appendChild(avatar);

  // User info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'flex-1';

  const username = document.createElement('h2');
  username.className = 'text-3xl font-bold text-white mb-2';
  username.textContent = user.username || user.email || 'Unknown User';
  infoDiv.appendChild(username);

  const email = document.createElement('p');
  email.className = 'text-neutral-400 text-sm mb-4';
  email.textContent = user.email || 'No email';
  infoDiv.appendChild(email);

  const userId = document.createElement('p');
  userId.className = 'text-neutral-500 text-xs font-mono';
  userId.textContent = `ID: ${user.id}`;
  infoDiv.appendChild(userId);

  header.appendChild(avatarContainer);
  header.appendChild(infoDiv);
  card.appendChild(header);

  // Social stats section
  const statsSection = document.createElement('div');
  statsSection.className = 'grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-neutral-700';

  const createStatBox = (label: string, value: string | number) => {
    const box = document.createElement('div');
    box.className = 'text-center';
    const valueEl = document.createElement('div');
    valueEl.className = 'text-2xl font-bold text-cyan-400';
    valueEl.textContent = String(value);
    const labelEl = document.createElement('div');
    labelEl.className = 'text-xs text-neutral-400 uppercase tracking-wide mt-1';
    labelEl.textContent = label;
    box.appendChild(valueEl);
    box.appendChild(labelEl);
    return box;
  };

  statsSection.appendChild(createStatBox('Friends', '0')); // Placeholder
  statsSection.appendChild(createStatBox('Wins', '0')); // Placeholder
  statsSection.appendChild(createStatBox('Level', '1')); // Placeholder

  card.appendChild(statsSection);

  // Action buttons section
  const buttonsDiv = document.createElement('div');
  buttonsDiv.className = 'flex gap-3 flex-wrap';

  // Chat button
  const chatBtn = document.createElement('button');
  chatBtn.className = 'flex-1 min-w-[150px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors uppercase tracking-tight text-sm';
  chatBtn.textContent = '💬 Send Message';
  chatBtn.addEventListener('click', async () => {
    // Open chat with this user
    try {
      await sendChatInvite(user.id);
      console.log('Chat invite sent to user:', user.id);
    } catch (err) {
      console.error('Failed to send chat invite:', err);
    }
  });
  buttonsDiv.appendChild(chatBtn);

  // Add friend button
  const addFriendBtn = document.createElement('button');
  addFriendBtn.className = 'flex-1 min-w-[150px] px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors uppercase tracking-tight text-sm';
  addFriendBtn.textContent = '👥 Add Friend';
  addFriendBtn.addEventListener('click', async () => {
    try {
      const success = await friendsManager.addFriend(user.id);
      if (success) {
        addFriendBtn.disabled = true;
        addFriendBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        addFriendBtn.classList.add('bg-neutral-600', 'text-neutral-400');
        addFriendBtn.textContent = '✓ Request Sent';
      }
    } catch (err) {
      console.error('Failed to add friend:', err);
    }
  });
  buttonsDiv.appendChild(addFriendBtn);

  // Block button
  const blockBtn = document.createElement('button');
  blockBtn.className = 'flex-1 min-w-[150px] px-4 py-3 bg-red-600/70 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors uppercase tracking-tight text-sm';
  blockBtn.textContent = '🚫 Block';
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
  buttonsDiv.appendChild(blockBtn);

  card.appendChild(buttonsDiv);

  // Social links section (placeholder)
  const socialsDiv = document.createElement('div');
  socialsDiv.className = 'mt-8 pt-8 border-t border-neutral-700';

  const socialsTitle = document.createElement('h3');
  socialsTitle.className = 'text-sm font-semibold text-neutral-300 uppercase tracking-wide mb-4';
  socialsTitle.textContent = 'Socials';
  socialsDiv.appendChild(socialsTitle);

  const socialsLinks = document.createElement('div');
  socialsLinks.className = 'flex gap-2';

  socialsDiv.appendChild(socialsLinks);
  card.appendChild(socialsDiv);

  // Add card to container
  container.appendChild(card);

  return card;
}
