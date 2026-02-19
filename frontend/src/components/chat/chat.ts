import { getCurrentTheme } from '../../lib/theme';
import {
  chatSocket,
  currentUserId,
  currentChatId,
  chats,
  messages,
  chatMembers,
  unreadCounts,
  MESSAGE_LIMIT,
  setCurrentUserId,
  setCurrentChatId,
  setMessageOffset,
  messageOffset,
  connectChatWebSocket,
  loadChats,
  loadMessages,
  sendChatMessage,
  sendChatInvite as serviceSendChatInvite,
  leaveGroupChat,
  markChatAsRead,
  addUserToChat,
  createGroupChat,
  getChatDisplayName,
  escapeHtml,
} from './chatService';

import { t } from '../../lib/intlayer';
import { showSuccessToast, showErrorToast } from '../shared/Toast';
import { sendGameInvite as sendPongInvite } from '../pong/ws';
import { createCustomGame as createTrisCustomGame } from '../../lib/tris';

// Re-export for backward compatibility
export { sendChatInvite } from './chatService';

// ============================================================================
// INITIALIZATION
// ============================================================================

export function initChat(userId: string) {
  // initialization
  setCurrentUserId(userId);
  connectChatWebSocket().catch(err => console.error('Failed to establish chat connection:', err));
  
  // Expose UI control functions to global scope for service to call
  (window as any).__renderMessages = renderMessages;
  (window as any).__renderChatList = renderChatList;
  (window as any).__scrollToBottom = scrollToBottom;
  (window as any).__updateLoadMoreBtn = updateLoadMoreBtn;
  (window as any).__openChat = openChatAction;
  (window as any).__resetChatUI = resetChatUI;
  (window as any).__refreshChatsIfOpen = refreshChatsIfOpen;
  (window as any).__closeChatModal = closeChatModal;
}

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

export async function openChatModal() {
  const modal = document.getElementById('chat-modal');
  if (!modal) {
    console.error('❌ chat-modal element not found in DOM');
    return;
  }

  
  // FIX: Ensure modal is direct child of body (not inside a hidden parent)
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');

  if (chats.length === 0) {
    try {
      await loadChats();
    } catch (err) {
      console.error('Failed to open chat modal:', err);
    }
  }

  renderChatList();
}

export function closeChatModal() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  setCurrentChatId(null);

  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) {
    chatHeader.textContent = t('chat.select');
    chatHeader.title = '';
  }

  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) chatMessages.innerHTML = '';

  const leaveGroupBtn = document.getElementById('leave-group-btn');
  if (leaveGroupBtn) leaveGroupBtn.classList.add('hidden');

  const addUserBtn = document.getElementById('add-user-btn');
  if (addUserBtn) addUserBtn.classList.add('hidden');

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';

  const membersEl = document.getElementById('chat-members');
  if (membersEl) membersEl.innerHTML = '';

  renderChatList();
  updateChatControls();
}

// ============================================================================
// CHAT LIST RENDERING & SELECTION
// ============================================================================

export function renderChatList() {
  const chatList = document.getElementById('chat-list');
  if (!chatList) {
    console.error('chat-list element not found in DOM');
    return;
  }

  if (chats.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.textContent = t('chat.no-chat');
    chatList.innerHTML = '';
    chatList.appendChild(placeholder);
    console.warn('No chats to display');
    return;
  }

  chatList.innerHTML = '';

  chats.forEach(chat => {
    const chatItem = document.createElement('div');
    chatItem.id = `chat-item-${chat.id}`;
    chatItem.className = 'chat-item cursor-pointer';
    if (String(currentChatId) === String(chat.id)) {
      chatItem.classList.add('active', 'border-accent-blue', 'dark:border-accent-green', 'border-2', 'rounded', 'p-2');
      chatItem.setAttribute('aria-selected', 'true');
    } else {
      chatItem.setAttribute('aria-selected', 'false');
    }
    chatItem.onclick = () => {
      selectChat(chat.id);
    };

    const chatName = document.createElement('div');
    chatName.className = 'chat-item-name text-size-lg font-medium truncate';
    const fullName = getChatDisplayName(chat);
    chatName.textContent = truncateText(fullName, 30);
    chatName.title = fullName;

    const chatType = document.createElement('div');
    chatType.className = 'chat-item-type text-accent-blue dark:text-dark-green inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold';
    if (chat.chatType === 'dm')
      chatType.textContent = 'Direct Message';
    else
      chatType.textContent = 'Group Chat';

    const unreadCount = unreadCounts.get(chat.id) || 0;
    if (unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'unread-badge';
      badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      chatName.appendChild(badge);
    }

    chatItem.appendChild(chatName);
    chatItem.appendChild(chatType);
    chatList.appendChild(chatItem);

    if (String(currentChatId) === String(chat.id)) {
      setTimeout(() => {
        chatItem.scrollIntoView({ block: 'nearest' });
      }, 0);
    }
  });

  updateChatControls();
}

async function selectChat(chatId: string) {
  if (!chatId) return;
  setCurrentChatId(chatId);
  setMessageOffset(0);

  renderChatList();
  try {
    await loadMessages(chatId, 0);
  } catch (err) {
    console.error('Failed to select chat:', err);
  }

  const chatHeader = document.getElementById('chat-header');
  const leaveGroupBtn = document.getElementById('leave-group-btn');
  let addUserBtn = document.getElementById('add-user-btn');
  let pongBtn = document.getElementById('chat-pong-btn');
  let trisBtn = document.getElementById('chat-tris-btn');

  if (chatHeader && leaveGroupBtn) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      const fullName = getChatDisplayName(chat);
      chatHeader.textContent = truncateText(fullName, 29);
      chatHeader.title = fullName;
      if (chat.chatType === 'group') {
        leaveGroupBtn.classList.remove('hidden');
        if (!addUserBtn) {
          addUserBtn = document.createElement('button');
          addUserBtn.id = 'add-user-btn';
          addUserBtn.className = 'w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-md';
          addUserBtn.title = 'Add user to group';
          addUserBtn.setAttribute('aria-label', 'Add user');
          addUserBtn.innerHTML = `
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
            <span class="sr-only">Add User</span>
          `;
          addUserBtn.addEventListener('click', () => {
            setAddToChatId(chatId);
            openFriendSelectionModal();
          });
          const actions = document.getElementById('chat-header-actions');
            if (actions) {
              const leaveBtnInDom = document.getElementById('leave-group-btn');
              if (leaveBtnInDom) {
                actions.insertBefore(addUserBtn, leaveBtnInDom);
              } else {
                actions.appendChild(addUserBtn);
              }
            } else {
              // fallback: insert before leave button if we can't find the actions container
              leaveGroupBtn.parentElement?.insertBefore(addUserBtn, leaveGroupBtn);
            }
        } else {
          addUserBtn.classList.remove('hidden');
        }
        // hide game buttons for groups
        if (pongBtn) pongBtn.classList.add('hidden');
        if (trisBtn) trisBtn.classList.add('hidden');
      } else {
        leaveGroupBtn.classList.add('hidden');
        if (addUserBtn) addUserBtn.classList.add('hidden');
        // For direct messages show game invite buttons
        // Create Pong button if not present
        if (!pongBtn) {
          pongBtn = document.createElement('button');
          pongBtn.id = 'chat-pong-btn';
          pongBtn.className = 'w-8 h-8 flex items-center justify-center bg-accent-cyan hover:bg-accent-cyan/90 text-black rounded-md';
          pongBtn.title = 'Invite to Pong';
          pongBtn.setAttribute('aria-label', 'Pong invite');
          pongBtn.innerHTML = `
            <img src="/assets/pong.svg" alt="Pong" class="w-6 h-6 object-contain" />
            <span class="sr-only">Pong</span>
          `;
          pongBtn.addEventListener('click', async () => {
            if (!chat.otherUserId) return;
            try {
              const ok = await sendPongInvite(chat.otherUserId);
              if (ok) showSuccessToast(`Pong invite sent to ${chat.otherUserId}`);
              else showErrorToast('Failed to send Pong invite');
            } catch (err) {
              console.error('Pong invite error', err);
              showErrorToast('Failed to send Pong invite');
            }
          });
        } else {
          pongBtn.classList.remove('hidden');
        }

        // Create Tris button if not present
        if (!trisBtn) {
          trisBtn = document.createElement('button');
          trisBtn.id = 'chat-tris-btn';
          trisBtn.className = 'w-8 h-8 flex items-center justify-center bg-accent-orange hover:bg-accent-orange/90 text-black rounded-md';
          trisBtn.title = 'Invite to Tris';
          trisBtn.setAttribute('aria-label', 'Tris invite');
          trisBtn.innerHTML = `
            <img src="/assets/tris.svg" alt="Tris" class="w-5 h-5 object-contain" />
            <span class="sr-only">Tris</span>
          `;
          trisBtn.addEventListener('click', () => {
            if (!chat.otherUserId) return;
            try {
              createTrisCustomGame(chat.otherUserId);
              showSuccessToast(`Tris invite sent to ${chat.otherUserId}`);
            } catch (err) {
              console.error('Tris invite error', err);
              showErrorToast('Failed to send Tris invite');
            }
          });
        } else {
          trisBtn.classList.remove('hidden');
        }

        // Insert buttons into header actions next to leave/add controls
        const actions = document.getElementById('chat-header-actions');
        if (actions) {
          // Ensure pong first, then tris, before leave button
          const leaveBtnInDom = document.getElementById('leave-group-btn');
          if (pongBtn && !actions.contains(pongBtn)) actions.insertBefore(pongBtn, leaveBtnInDom || null);
          if (trisBtn && !actions.contains(trisBtn)) actions.insertBefore(trisBtn, leaveBtnInDom || null);
        }
      }
    }
  }

  markChatAsRead(chatId);
  scrollToBottom();

  // update compact members list in header
  renderMemberList();
}

// Render a compact members list for the currently selected chat
export function renderMemberList() {
  const container = document.getElementById('chat-members');
  if (!container) return; // nothing to render into
  container.innerHTML = '';

  if (!currentChatId) {
    container.textContent = 'No chat selected';
    return;
  }
  const currentChat = chats.find(c => c.id === currentChatId);
  // If DM, show when you became friends with the other user (friendsSince)
  if (currentChat && currentChat.chatType === 'dm') {
    container.style.display = '';
    container.textContent = 'Loading...';
    const otherUserId = currentChat.otherUserId || (currentChat.members && currentChat.members.find((m: any) => String(m.userId) !== String(currentUserId))?.userId);
    if (!otherUserId) {
      container.textContent = '';
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/users/relationships/friends', { method: 'GET', credentials: 'include' });
        if (!res.ok) {
          container.textContent = '';
          return;
        }
        const friends = await res.json();
        const friend = friends.find((f: any) => String(f.userId || f.id) === String(otherUserId));
        if (friend && friend.friendsSince) {
          const since = new Date(friend.friendsSince);
          const day = String(since.getDate()).padStart(2, '0');
          const month = String(since.getMonth() + 1).padStart(2, '0');
          const year = since.getFullYear();
          container.textContent = `Friends since: ${day}/${month}/${year}`;
        } else {
          container.textContent = '';
        }
      } catch (err) {
        console.error('Failed to load friends for friendsSince:', err);
        container.textContent = '';
      }
    })();

    return;
  }

  const members = chatMembers.get(currentChatId) || (currentChat?.members || []);
  if (!members || members.length === 0) {
    container.textContent = 'No members';
    return;
  }

  // Show full names under the header, truncated with ellipsis when too many
  const maxNames = 6;
  const names = members.map((m: any) => m.username || String(m.userId || m.id || 'Unknown'));
  const shown = names.slice(0, maxNames).join(', ');
  container.textContent = shown + (names.length > maxNames ? ' ...' : '');
}

function truncateText(text: string | undefined | null, max = 30) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// Wrapper function for service to call UI action
function openChatAction(chatId: string) {
  openChatModal();
  selectChat(chatId);
}

function updateChatControls() {
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement | null;

  const enabled = !!currentChatId;

  if (input) {
    input.disabled = !enabled;
    input.placeholder = enabled ? t('chat.typing-placeholder') : t('chat.selector-placeholder');
  }

  if (sendBtn) {
    sendBtn.disabled = !enabled;
  }
}

// ============================================================================
// MESSAGE RENDERING
// ============================================================================

export async function renderMessages() {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  if (!currentChatId) {
    messagesContainer.innerHTML = '<div class="placeholder">Select a chat to start messaging</div>';
    return;
  }

  const chatMessages = messages.get(currentChatId) || [];

  const currentChat = chats.find(c => c.id === currentChatId);
  const isDmChat = currentChat && currentChat.chatType === 'dm';

  if (chatMessages.length === 0) {
    messagesContainer.innerHTML = '<div class="placeholder">No messages yet</div>';
    return;
  }

  messagesContainer.innerHTML = '';

  chatMessages.forEach(msg => {
    const messageDiv = document.createElement('div');
    const senderId = msg.senderId || msg.sender_id;
    const createdAt = msg.createdAt || msg.created_at;
    const isPrivate = msg.isPrivate || false;
    const isSystem = msg.isSystem || senderId === 'system' || senderId === null;

    if (isSystem) {
      messageDiv.className = 'message message-system text-center mx-auto bg-blue-600 text-white italic px-3 py-2 rounded-md max-w-[80%]';
      messageDiv.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
      messagesContainer.appendChild(messageDiv);
      return;
    }

    const isSent = String(senderId) === String(currentUserId);

    const baseClasses = 'message px-3 py-2 rounded-lg max-w-[70%] break-words w-fit';
    const variantClasses = isSent
      ? 'bg-green-600 text-white'
      : 'bg-gray-700 text-gray-100';
    const alignmentClasses = isSent ? 'ml-auto' : 'mr-auto';

    messageDiv.className = `${baseClasses} ${variantClasses} ${alignmentClasses}`;

    const membersForChat = chatMembers.get(currentChatId || '') || [];
    const matchedMember = membersForChat.find((m: any) => String(m.userId) === String(senderId));
    const displayName = msg.from || (matchedMember && matchedMember.username) || (msg.senderName) || senderId;

    messageDiv.innerHTML = `
      ${!isSent && !isDmChat ? `<div class="message-header text-xs opacity-75">from ${escapeHtml(displayName)}</div>` : ''}
      <div class="message-content">${escapeHtml(msg.content)}</div>
      <div class="message-footer text-xs opacity-75">
        <span>${new Date(createdAt).toLocaleTimeString()}</span>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
  });
}

export function scrollToBottom() {
  const scrollContainer = document.getElementById('chat-messages-container') || document.getElementById('chat-messages');
  if (scrollContainer) {
    setTimeout(() => {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }, 0);
  }
}

function updateLoadMoreBtn(show: boolean) {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.style.display = show ? 'inline-block' : 'none';
  }
}

async function loadMoreMessages() {
  if (!currentChatId) return;

  setMessageOffset(messageOffset + MESSAGE_LIMIT);
  try {
    await loadMessages(currentChatId, messageOffset);
  } catch (err) {
    console.error('Failed to load more messages:', err);
  }
}

// ============================================================================
// RESET UI
// ============================================================================

function resetChatUI(chatId: string) {
  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) chatHeader.textContent = 'Select a chat';

  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) chatMessages.innerHTML = '';

  const leaveBtn = document.getElementById('leave-group-btn');
  if (leaveBtn) leaveBtn.classList.add('hidden');

  const addBtn = document.getElementById('add-user-btn');
  if (addBtn) addBtn.classList.add('hidden');

  updateChatControls();
  renderChatList();
  renderMemberList();
}

function refreshChatsIfOpen() {
  const chatModal = document.getElementById('chat-modal');
  if (chatModal && !chatModal.classList.contains('hidden')) {
    loadChats().then(() => {
      renderChatList();
    }).catch(err => console.error('Failed to refresh chats', err));
  } else {
    renderChatList();
  }
}

// ============================================================================
// FRIEND SELECTION MODAL
// ============================================================================

let selectedFriendsForGroup: Set<string> = new Set();
let addToChatId: string | null = null;

function setAddToChatId(chatId: string | null) {
  addToChatId = chatId;
}

async function fetchFriends(): Promise<any[]> {
  try {
    const response = await fetch('/api/users/relationships/friends', {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch friends: ${response.statusText}`);
    }

    const friends = await response.json();
    return Array.isArray(friends) ? friends : [];
  } catch (err) {
    console.error('Error fetching friends:', err);
    return [];
  }
}

async function openFriendSelectionModal() {
  const modal = document.getElementById('friend-selection-modal');
  if (!modal) return;

  // FIX: Ensure modal is direct child of body (not inside a hidden parent)
  if (modal.parentElement !== document.body) {
    console.warn('⚠️ Friend modal parent is not body, moving to body');
    document.body.appendChild(modal);
  }

  if (addToChatId) {
    try {
      await loadChats();
    } catch (err) {
      console.error('Failed to refresh chats before opening add-user modal', err);
    }
  }

  modal.classList.remove('hidden');
  selectedFriendsForGroup.clear();

  const createGroupSubmitBtn = document.getElementById('create-group-submit-btn') as HTMLButtonElement | null;
  if (createGroupSubmitBtn) {
    createGroupSubmitBtn.textContent = addToChatId ? t('chat.add-selected') : t('chat.create-group');
  }

  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  if (groupNameInput && !addToChatId) {
    groupNameInput.value = '';
  }

  renderFriendsList();

  // Re-evaluate submit button state when group name changes
  if (groupNameInput) {
    // Use oninput to avoid adding multiple listeners
    groupNameInput.oninput = () => {
      updateSelectedFriendsTags();
    };
  }

  if (groupNameInput) {
    if (addToChatId) {
      if (groupNameInput.parentElement) groupNameInput.parentElement.style.display = 'none';
    } else {
      if (groupNameInput.parentElement) groupNameInput.parentElement.style.display = '';
    }
  }

  const selectedTags = document.getElementById('selected-friends-tags');
  const selectedCount = document.getElementById('selected-count');
  if (addToChatId) {
    if (selectedTags) selectedTags.style.display = 'none';
    if (selectedCount) selectedCount.style.display = 'none';
  } else {
    if (selectedTags) selectedTags.style.display = '';
    if (selectedCount) selectedCount.style.display = '';
  }

  const header = modal.querySelector('h2') as HTMLElement | null;
  const desc = modal.querySelector('p') as HTMLElement | null;
  if (addToChatId) {
    if (header) header.textContent = t('chat.add');
    if (desc) desc.textContent = t('chat.select-group');
  } else {
    if (header) header.textContent = t('chat.create-group');
    if (desc) desc.textContent = t('chat.select-group');
  }
}

function closeFriendSelectionModal() {
  const modal = document.getElementById('friend-selection-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  selectedFriendsForGroup.clear();
  addToChatId = null;
  const createGroupSubmitBtn = document.getElementById('create-group-submit-btn') as HTMLButtonElement | null;
  if (createGroupSubmitBtn) createGroupSubmitBtn.textContent = t('chat.create-group');

  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  if (groupNameInput) {
    groupNameInput.oninput = null;
  }
  if (groupNameInput && groupNameInput.parentElement) groupNameInput.parentElement.style.display = '';

  const selectedTags = document.getElementById('selected-friends-tags');
  const selectedCount = document.getElementById('selected-count');
  if (selectedTags) selectedTags.style.display = '';
  if (selectedCount) selectedCount.style.display = '';

  if (modal) {
    const header = modal.querySelector('h2') as HTMLElement | null;
    const desc = modal.querySelector('p') as HTMLElement | null;
    if (header) header.textContent = t('chat.create-group');
    if (desc) desc.textContent = t('chat.select-group');
  }
}

async function renderFriendsList() {
  const friendsList = document.getElementById('friends-list');
  if (!friendsList) return;

  friendsList.innerHTML = '<div class="text-neutral-400 text-center">Loading friends...</div>';

  const friends = await fetchFriends();

  if (friends.length === 0) {
    friendsList.innerHTML = '<div class="text-neutral-400 text-center">No friends available</div>';
    return;
  }

  friendsList.innerHTML = '';

  let friendsToShow = friends;
  if (addToChatId) {
    const existing = new Set<string>();
    const members = chatMembers.get(addToChatId) || (chats.find(c => c.id === addToChatId)?.members || []);
    members.forEach((m: any) => existing.add(String(m.userId)));
    if (currentUserId) existing.add(String(currentUserId));
    friendsToShow = friends.filter(f => !existing.has(String(f.id || f.userId)));
  }

  if (friendsToShow.length === 0) {
    friendsList.innerHTML = `<div class="text-neutral-400 text-center">${t('chat.no-friends')}</div>`;
    return;
  }

  friendsToShow.forEach(friend => {
    const friendId = String(friend.id || friend.userId);
    const friendName = friend.username || friend.name || 'Unknown';

    const friendItem = document.createElement('div');
    friendItem.className = 'flex items-center gap-3 p-3 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md cursor-pointer transition';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'w-4 h-4 cursor-pointer';
    checkbox.checked = selectedFriendsForGroup.has(friendId);
    checkbox.setAttribute('data-friend-id', friendId);

    const label = document.createElement('label');
    label.className = 'flex-1 cursor-pointer text-black dark:text-white';
    label.textContent = friendName;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedFriendsForGroup.add(friendId);
      } else {
        selectedFriendsForGroup.delete(friendId);
      }
      updateSelectedFriendsTags();
    });

    // Prevent clicks on the checkbox from bubbling to the container (avoids double-toggle)
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    friendItem.appendChild(checkbox);
    friendItem.appendChild(label);

    // Toggle checkbox only when clicking the friend item outside of the input/button/label
    friendItem.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'LABEL' || target.closest('input')) ) {
        return;
      }
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    friendsList.appendChild(friendItem);
  });

  // Ensure submit button and selected tags reflect current selection after rendering
  updateSelectedFriendsTags();
}

function updateSelectedFriendsTags() {
  const selectedCount = document.getElementById('selected-count');
  const selectedTags = document.getElementById('selected-friends-tags');
  const submitBtn = document.getElementById('create-group-submit-btn') as HTMLButtonElement | null;

  if (selectedCount) {
    selectedCount.textContent = String(selectedFriendsForGroup.size);
  }

  if (selectedTags) {
    selectedTags.innerHTML = '';
    selectedFriendsForGroup.forEach(friendId => {
      const tag = document.createElement('div');
      tag.className = 'bg-[#0dff66] text-black px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2';
      tag.innerHTML = `
        <span>${friendId}</span>
        <button class="hover:text-black/70" type="button">×</button>
      `;

      tag.addEventListener('click', () => {
        selectedFriendsForGroup.delete(friendId);
        updateSelectedFriendsTags();
        const checkbox = document.querySelector(`input[data-friend-id="${friendId}"]`) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = false;
        }
      });

      selectedTags.appendChild(tag);
    });
  }

  if (submitBtn instanceof HTMLButtonElement) {
    // Disable when no friends selected
    let disable = selectedFriendsForGroup.size < 1;

    // If creating a new group (not adding to existing chat), also require a non-empty group name
    if (!addToChatId) {
      const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement | null;
      const groupName = groupNameInput?.value?.trim() || '';
      if (groupName.length === 0) disable = true;
    }

    submitBtn.disabled = disable;
  }
}

async function handleGroupChatSubmit() {
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  const groupName = groupNameInput?.value.trim();

  if (addToChatId) {
    // Add users to existing chat
    if (selectedFriendsForGroup.size < 1) {
      alert('Please select at least one friend to add');
      return;
    }

    const memberIds = Array.from(selectedFriendsForGroup);
    try {
      for (const memberId of memberIds) {
        try {
          await addUserToChat(addToChatId, memberId);
        } catch (err) {
          console.error(`Error adding user ${memberId} to chat:`, err);
          alert(`Failed to add user ${memberId} to chat: ${(err as Error).message}`);
        }
      }

      closeFriendSelectionModal();
      await loadChats();
      selectChat(addToChatId);
      addToChatId = null;
    } catch (err) {
      console.error('Error adding users to chat:', err);
      alert(`Failed to add users: ${(err as Error).message}`);
    }
    return;
  }

  // Create new group chat
  if (!groupName) {
    alert('Please enter a group name');
    return;
  }

  if (selectedFriendsForGroup.size < 1) {
    alert('Please select at least one friend');
    return;
  }

  try {
    const memberIds = Array.from(selectedFriendsForGroup);
    const chatId = await createGroupChat(groupName, memberIds);

    closeFriendSelectionModal();
    await loadChats();
    selectChat(chatId);

    // group created
  } catch (err) {
    console.error('Error creating group chat:', err);
    alert(`Failed to create group chat: ${(err as Error).message}`);
  }
}

// ============================================================================
// MESSAGE INPUT
// ============================================================================

function handleMessageKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (input && input.value.trim()) {
      sendChatMessage(input.value.trim());
      input.value = '';
    }
  }
}

// ============================================================================
// EVENT LISTENERS SETUP
// ============================================================================

export function setupChatEventListeners() {
  if ((window as any).__chat_listeners_attached) {
    console.log('⚠️ Chat event listeners already attached, skipping');
    return;
  }

  console.log('🎯 Setting up chat event listeners...');

  const closeBtn = document.getElementById('chat-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeChatModal);
  }

  const sendBtn = document.getElementById('chat-send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const input = document.getElementById('chat-input') as HTMLInputElement;
      if (input && input.value.trim()) {
        sendChatMessage(input.value.trim());
        input.value = '';
      }
    });
  }

  const leaveGroupBtn = document.getElementById('leave-group-btn');
  if (leaveGroupBtn) {
    leaveGroupBtn.addEventListener('click', async () => {
      if (!currentChatId) return;

      const chat = chats.find(c => c.id === currentChatId);
      if (!chat) return;

      const chatName = getChatDisplayName(chat);
      if (confirm(`Are you sure you want to leave "${chatName}"?`)) {
        try {
          await leaveGroupChat(currentChatId);
        } catch (err) {
          alert(`Failed to leave group: ${(err as Error).message}`);
        }
      }
    });
  }

  const input = document.getElementById('chat-input') as HTMLInputElement;
  if (input) {
    input.addEventListener('keypress', handleMessageKeyPress);
  }

  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeChatModal();
      }
    });
  }

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreMessages);
  }

  const createGroupBtn = document.getElementById('create-group-btn');
  if (createGroupBtn) {
    createGroupBtn.addEventListener('click', openFriendSelectionModal);
  }

  const friendModalCloseBtn = document.getElementById('friend-modal-close-btn');
  if (friendModalCloseBtn) {
    friendModalCloseBtn.addEventListener('click', closeFriendSelectionModal);
  }

  const friendModalCancelBtn = document.getElementById('friend-modal-cancel-btn');
  if (friendModalCancelBtn) {
    friendModalCancelBtn.addEventListener('click', closeFriendSelectionModal);
  }

  const createGroupSubmitBtn = document.getElementById('create-group-submit-btn');
  if (createGroupSubmitBtn) {
    createGroupSubmitBtn.addEventListener('click', handleGroupChatSubmit);
  }

  const friendModal = document.getElementById('friend-selection-modal');
  if (friendModal) {
    friendModal.addEventListener('click', (e) => {
      if (e.target === friendModal) {
        closeFriendSelectionModal();
      }
    });
  }

  (window as any).__chat_listeners_attached = true;
  console.log('✅ Chat event listeners successfully attached');
}
