import { showInfoToast, showToast } from '../shared/Toast';
import { getCurrentTheme } from '../../lib/theme';
import type { User } from '../../lib/auth';

let chatSocket: WebSocket | null = null;
let currentUserId: string | null = null;
let currentChatId: string | null = null;
let chats: any[] = [];
let messages: Map<string, any[]> = new Map();
let chatMembers: Map<string, any[]> = new Map();
let unreadCounts: Map<string, number> = new Map(); // Track unread message counts
let messageOffset = 0;
const MESSAGE_LIMIT = 50;

export function initChat(userId: string) {
  currentUserId = userId;
  connectChatWebSocket();
}

export async function openChatModal() {
  const modal = document.getElementById('chat-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // Load chats if not already loaded
  if (chats.length === 0) {
    try {
      await loadChats();
    } catch (err) {
      console.error('Failed to open chat modal:', err);
    }
  }
  
  // Render chat list
  renderChatList();
}

export function closeChatModal() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  // Reset state
  currentChatId = null;
}

async function loadChats() {
  try {
    const response = await fetch('/api/chat/', {
      method: 'GET',
      credentials: 'include'
    });
	console.log('Load chats response:', response);
    if (!response.ok) {
      throw new Error(`Failed to load chats: ${response.statusText}`);
    }

    chats = await response.json();

    // Store members for each chat and extract otherUserId for DM chats
    chats.forEach(chat => {
      if (chat.members) {
        chatMembers.set(chat.id, chat.members);
        // For DM chats, store the other user's ID directly on the chat object
        if (chat.chatType === 'dm') {
          const otherMember = chat.members.find((m: User) => String(m.userId) !== String(currentUserId));
          if (otherMember) {
            chat.otherUserId = String(otherMember.userId);
          }
        }
      }
    });

    currentChatId = chats.length > 0 ? chats[0].id : null;
    renderChatList();
  } catch (err) {
    console.error('Error loading chats:', err);
  }
}

function renderChatList() {
  const chatList = document.getElementById('chat-list');
  if (!chatList) return;

  if (chats.length === 0) {
    chatList.innerHTML = '<div class="placeholder">No chats yet</div>';
    return;
  }

  chatList.innerHTML = '';

  chats.forEach(chat => {
    const chatItem = document.createElement('div');
    chatItem.className = `chat-item ${currentChatId === chat.id ? 'active' : ''}`;
    if (getCurrentTheme() === 'dark') {
      chatItem.classList.add('dark');
    }
    chatItem.onclick = () => selectChat(chat.id);

    const chatName = document.createElement('div');
    chatName.className = 'chat-item-name text-size-lg font-medium';
    chatName.textContent = getChatDisplayName(chat);

    const chatType = document.createElement('div');
    // Use Tailwind utility classes to color the chat type label differently for DM vs Group
    chatType.className = 'chat-item-type text-dark-green inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold';
    if (chat.chatType === 'dm')
      chatType.textContent = 'Direct Message';
    else
      chatType.textContent = 'Group Chat';

    // Add unread badge if there are unread messages
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
  });

  currentChatId = currentChatId || chats[0].id;
}

function getChatDisplayName(chat: any): string {
  if (chat.chatType === 'dm') {
    // For DM chats, show the other user's name
    const otherMember = chat.members?.find((m: any) => m.userId !== currentUserId);
    return otherMember ? otherMember.username : 'Unknown User';
  }
  return chat.name || 'Unnamed Chat';
}

async function selectChat(chatId: string) {
  currentChatId = chatId;
  messageOffset = 0;

  renderChatList();
  try {
    await loadMessages(chatId, 0);
  } catch (err) {
    console.error('Failed to select chat:', err);
  }

  // Update chat header and show/hide leave group button
  const chatHeader = document.getElementById('chat-header');
  const leaveGroupBtn = document.getElementById('leave-group-btn');
  if (chatHeader && leaveGroupBtn) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chatHeader.textContent = getChatDisplayName(chat);
      // Show leave group button only for group chats
      if (chat.chatType === 'group') {
        leaveGroupBtn.classList.remove('hidden');
      } else {
        leaveGroupBtn.classList.add('hidden');
      }
    }
  }

  // Mark as read
  markChatAsRead(chatId);
  scrollToBottom();
}

async function loadMessages(chatId: string, offset = 0) {
  try {
    const response = await fetch(`/api/chat/messages?chatId=${chatId}&limit=${MESSAGE_LIMIT}&offset=${offset}`, {
      method: 'GET',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.statusText}`);
    }

    const newMessages = await response.json();

    // Reverse to show oldest first (WhatsApp style)
    if (offset === 0) {
      messages.set(chatId, newMessages.reverse());
    } else {
      const existing = messages.get(chatId) || [];
      messages.set(chatId, [...newMessages.reverse(), ...existing]);
    }

    renderMessages();

    // Show/hide load more button
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) {
      if (newMessages.length === MESSAGE_LIMIT) {
        loadMoreBtn.style.display = 'inline-block';
      } else {
        loadMoreBtn.style.display = 'none';
      }
    }

    // Scroll to bottom only on initial load
    if (offset === 0) {
      scrollToBottom();
    }
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

async function loadMoreMessages() {
  if (!currentChatId) return;

  messageOffset += MESSAGE_LIMIT;
  try {
    await loadMessages(currentChatId, messageOffset);
  } catch (err) {
    console.error('Failed to load more messages:', err);
  }
}

export async function renderMessages() {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  if (!currentChatId) {
    messagesContainer.innerHTML = '<div class="placeholder">Select a chat to start messaging</div>';
    return;
  }

  const chatMessages = messages.get(currentChatId) || [];

  if (chatMessages.length === 0) {
    messagesContainer.innerHTML = '<div class="placeholder">No messages yet</div>';
    return;
  }

  messagesContainer.innerHTML = '';
  const isLightMode = getCurrentTheme() === 'light';

  chatMessages.forEach(msg => {
    const messageDiv = document.createElement('div');
    // Handle both snake_case (from API) and camelCase (from WebSocket)
    const senderId = msg.senderId || msg.sender_id;
    const createdAt = msg.createdAt || msg.created_at;
    const messageStatus = msg.messageStatus || msg.message_status;
    const isPrivate = msg.isPrivate || false;
    const isSystem = msg.isSystem || senderId === 'system' || senderId === null;

    // Handle system messages (use Tailwind for color)
    if (isSystem) {
      messageDiv.className = 'message message-system mx-auto bg-blue-600 text-white italic px-3 py-2 rounded-md max-w-[80%]';
      messageDiv.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
      messagesContainer.appendChild(messageDiv);
      return;
    }

    // Compare as strings since backend returns string IDs
    const isSent = String(senderId) === String(currentUserId);

    // Determine message class based on sender - same style for all messages
    // Base layout classes - use ml-auto for sent messages to push right, mr-auto for received to keep left
    const baseClasses = 'message px-3 py-2 rounded-lg max-w-[70%] break-words w-fit';
    const variantClasses = isSent
      ? 'bg-green-600 text-white'
      : 'bg-gray-700 text-gray-100';
    const alignmentClasses = isSent ? 'ml-auto' : 'mr-auto';

    messageDiv.className = `${baseClasses} ${variantClasses} ${alignmentClasses}`;

    messageDiv.innerHTML = `
      ${!isSent ? `<div class="message-header text-xs opacity-75">from ${escapeHtml(msg.from || senderId)}</div>` : ''}
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

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

export function connectChatWebSocket(): Promise<WebSocket> {
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    return Promise.resolve(chatSocket);
  }

  const wsUrl = `/chat/ws`;

  console.log('Connecting to chat WebSocket at', wsUrl);
  return new Promise((resolve, reject) => {
    try {
      const socket = new WebSocket(wsUrl);
      chatSocket = socket;

      socket.onopen = () => {
        console.log('Chat WebSocket connected');
        reconnectAttempts = 0; // Reset on successful connection
        resolve(socket);
      };

      socket.onmessage = (event) => {
        try {
          handleWebSocketMessage(JSON.parse(event.data));
        } catch (err) {
          console.error('Invalid WebSocket message', err, event.data);
        }
      };

      socket.onerror = (event) => {
        console.error('Chat WebSocket error', event);
        reject(event);
      };

      socket.onclose = () => {
        console.warn('Chat WebSocket closed');
        chatSocket = null;
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
          setTimeout(() => {
            connectChatWebSocket().catch(err => console.error('Reconnection failed:', err));
          }, RECONNECT_DELAY);
        } else {
          console.error('Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      reject(error);
    }
  });
}

function handleWebSocketMessage(data: any) {
  console.log('Received WebSocket message:', data);

  // Normalize incoming message formats from different server implementations.
  // Some servers use { event: 'name', ... } while others use { type: 'name', ... }
  const eventName = data?.event || data?.type || data?.typeName || null;
  if (!eventName) {
    console.warn('Unknown WebSocket message format, ignoring', data);
    return;
  }

  switch (eventName) {
    case 'chat.message':
      handleChatMessage(data);
      break;
    case 'chat.systemMessage':
      handleSystemMessage(data);
      break;
    case 'chat.messageSent':
      handleMessageSent(data);
      break;
    case 'chat.messageStatusUpdate':
      handleMessageStatusUpdate(data);
      break;
    case 'chat.privateMessage':
      handlePrivateMessage(data);
      break;
    default:
      console.warn('Unhandled chat websocket event:', eventName);
  }
}

function handleChatMessage(data: any) {
  const chatId = data.chatId;

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }

  const chatMessages = messages.get(chatId)!;
  chatMessages.push({
    id: data.messageId,
    senderId: String(data.senderId),
    from: data.from,
    content: data.content,
    createdAt: data.timestamp,
    messageStatus: data.messageStatus || 'sent',
    isPrivate: false
  });

  // Show toast notification if not currently viewing this chat
  if (currentChatId !== chatId) {
    const sender = data.from || 'Someone';
    const preview = data.content.substring(0, 30);
    const displayText = preview.length < data.content.length ? `${preview}...` : preview;
    showToast(`📨 ${sender}: ${displayText}`, 'info', {
      duration: 0,
      position: 'top-right',
      onClick: () => {
        openChatModal();
        selectChat(chatId);
      }
    });
    
    // Track unread message
    const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
    unreadCounts.set(chatId, unreadCount);
    renderChatList();
  } else {
    renderMessages();
    scrollToBottom();
  }
}

function handleSystemMessage(data: any) {
  const chatId = data.chatId;

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }

  const chatMessages = messages.get(chatId)!;
  chatMessages.push({
    id: data.messageId,
    senderId: 'system',
    content: data.message,
    createdAt: data.timestamp,
    isSystem: true
  });

  if (currentChatId === chatId) {
    renderMessages();
    scrollToBottom();
  } else {
    showToast(data.message, 'info');
  }
}

function handleMessageSent(data: any) {
  console.log('Message sent confirmation:', data);
  const { messageId, chatId, content, status, name, chatType } = data;
  
  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }
  
  const chatMessages = messages.get(chatId)!;
  
  // Find the optimistic message by content (matches temp message sent before server response)
  let existingMessage = chatMessages.find(m => 
    m.content === content && 
    m.senderId === currentUserId && 
    m.id.toString().startsWith('temp_')
  );
  
  if (existingMessage) {
    // Update the optimistic message with real messageId and status
    existingMessage.id = messageId;
    existingMessage.messageStatus = status;
  } else {
    // Fallback: add message if optimistic update wasn't found
    // (shouldn't happen in normal flow, but handles edge cases)
    chatMessages.push({
      id: messageId,
      senderId: currentUserId,
      from: 'You',
      content: content,
      createdAt: new Date().toISOString(),
      messageStatus: status,
      isPrivate: chatType === 'dm'
    });
  }
  
  if (currentChatId === chatId) {
    renderMessages();
    scrollToBottom();
  }
}

function handleMessageStatusUpdate(data: any) {
  console.log('Message status updated:', data);
  const { messageId, chatId, status } = data;
  
  if (messages.has(chatId)) {
    const chatMessages = messages.get(chatId)!;
    const message = chatMessages.find(m => m.id === messageId);
    if (message) {
      message.messageStatus = status;
      if (currentChatId === chatId) {
        renderMessages();
      }
    }
  }
}

function handlePrivateMessage(data: any) {
  // Handle both flat and nested data structures
  const messageData = data.data || data;
  const { chatId, senderId, from, content, timestamp } = messageData;
  let dmChat = chats.find(c => c.id === String(chatId));
  console.log('DM chat found:', dmChat);
  if (!dmChat) {
    // Create a new DM chat entry - use the actual chatId from backend, not a prefixed version
    dmChat = {
      id: String(chatId),
      chatType: 'dm',
      otherUserId: String(senderId),
      members: [
        { userId: senderId, username: from },
        { userId: currentUserId, username: 'You' }
      ]
    };
    chats.push(dmChat);
    chatMembers.set(dmChat.id, dmChat.members);
  }
  
  // Add message to the chat
  if (!messages.has(dmChat.id)) {
    messages.set(dmChat.id, []);
  }
  
  const chatMessages = messages.get(dmChat.id)!;
  chatMessages.push({
    id: messageData.messageId || messageData.id || `msg_${Date.now()}`,
    senderId: String(senderId),
    from: from,
    content: content,
    createdAt: timestamp,
    messageStatus: 'delivered',
    isPrivate: true
  });
  
  // Handle UI updates
  if (currentChatId === dmChat.id) {
    // We're viewing this chat, so update messages and scroll
    renderMessages();
    scrollToBottom();
  } else {
    // Not viewing this chat, show toast and update unread count
    const preview = content.substring(0, 30);
    const displayText = preview.length < content.length ? `${preview}...` : preview;
    showToast(`💬 ${from}: ${displayText}`, 'info', {
      duration: 0,
      position: 'top-right',
      onClick: () => {
        openChatModal();
        selectChat(dmChat.id);
      }
    });
    
    // Track unread message
    const unreadCount = (unreadCounts.get(dmChat.id) || 0) + 1;
    unreadCounts.set(dmChat.id, unreadCount);
    
    // Only update chat list if new chat was created or unread count changed
    renderChatList();
  }
}

function markChatAsRead(chatId: string) {
  // Clear unread count and re-render chat list
  unreadCounts.delete(chatId);
  renderChatList();
  
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    const message = {
      event: 'chat.read',
      data: { chatId: chatId }
    };
    chatSocket.send(JSON.stringify(message));
  }
}

export async function sendChatInvite(otherUserId: string) {
    const res = await fetch(`/api/chat/start-private-chat`, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'include',
      method: 'POST',
      body: JSON.stringify({ toUserId: otherUserId }),
      
    });
    if (!res.ok) {
      throw new Error(`Failed to send chat invite: ${res.statusText}`);
    }
    const { chatId } = await res.json();
    
    // Reload chats to include the newly created chat
    await loadChats();
    
    openChatModal();
    selectChat(chatId);
    console.log('Private chat started:', chatId);
}

export async function leaveGroupChat(chatId: string) {
  try {
    const res = await fetch(`/api/chat/leave-group-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId })
    });

    if (!res.ok) {
      throw new Error(`Failed to leave group chat: ${res.statusText}`);
    }

    // Remove chat from list
    chats = chats.filter(c => c.id !== chatId);
    messages.delete(chatId);
    chatMembers.delete(chatId);

    // Close the chat and reset to list view
    if (currentChatId === chatId) {
      currentChatId = null;
      const chatHeader = document.getElementById('chat-header');
      if (chatHeader) {
        chatHeader.textContent = 'Select a chat';
      }
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.innerHTML = '';
      }
    }

    // Re-render the chat list
    renderChatList();
    console.log('Left group chat:', chatId);
  } catch (err) {
    console.error('Error leaving group chat:', err);
    throw err;
  }
}

export async function sendChatMessage(message: string) {
  if (!chatSocket || currentChatId === null) {
    console.error('Not connected to chat or no chat selected', chatSocket, currentChatId);
    return;
  }

  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) {
    console.error('Chat not found');
    return;
  }

  // Generate temporary message ID for optimistic update
  const tempMessageId = `temp_${Date.now()}`;

  // Add message to display immediately (optimistic update)
  if (!messages.has(currentChatId)) {
    messages.set(currentChatId, []);
  }

  const chatMessages = messages.get(currentChatId)!;
  chatMessages.push({
    id: tempMessageId,
    senderId: currentUserId,
    from: 'You',
    content: message,
    createdAt: new Date().toISOString(),
    messageStatus: 'sending',
    isPrivate: chat.chatType === 'dm'
  });

  renderMessages();
  scrollToBottom();

  let wsMessage;

  if (chat.chatType === 'dm') {
    // For DM chats, send as private message
    if (!chat.otherUserId) {
      console.error('Cannot find recipient in DM chat');
      return;
    }

    wsMessage = {
      event: 'chat.privateMessage',
      data: {
        toUserId: chat.otherUserId,
        content: message
      }
    };
  } else {
    // For group chats, send as chat message
    wsMessage = {
      event: 'chat.chatMessage',
      data: {
        chatId: currentChatId,
        content: message
      }
    };
  }

  if (chatSocket.readyState !== WebSocket.OPEN) {
    console.error('WebSocket not open, cannot send message');
    // Update status to failed
    const msg = chatMessages.find(m => m.id === tempMessageId);
    if (msg) {
      msg.messageStatus = 'failed';
      renderMessages();
    }
    return;
  }

  try {
    chatSocket.send(JSON.stringify(wsMessage));
    console.log('Message sent:', wsMessage);
  } catch (err) {
    console.error('Failed to send message:', err);
    // Update status to failed
    const msg = chatMessages.find(m => m.id === tempMessageId);
    if (msg) {
      msg.messageStatus = 'failed';
      renderMessages();
    }
  }
}

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

// Group chat creation functions
let selectedFriendsForGroup: Set<string> = new Set();

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

function openFriendSelectionModal() {
  const modal = document.getElementById('friend-selection-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  selectedFriendsForGroup.clear();
  
  // Reset the form
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  if (groupNameInput) {
    groupNameInput.value = '';
  }

  renderFriendsList();
}

function closeFriendSelectionModal() {
  const modal = document.getElementById('friend-selection-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  selectedFriendsForGroup.clear();
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

  friends.forEach(friend => {
    const friendId = String(friend.id || friend.userId);
    const friendName = friend.username || friend.name || 'Unknown';

    const friendItem = document.createElement('div');
    friendItem.className = 'flex items-center gap-3 p-3 hover:bg-neutral-700 rounded-md cursor-pointer transition';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'w-4 h-4 cursor-pointer';
    checkbox.checked = selectedFriendsForGroup.has(friendId);
    
    const label = document.createElement('label');
    label.className = 'flex-1 cursor-pointer text-white';
    label.textContent = friendName;

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedFriendsForGroup.add(friendId);
      } else {
        selectedFriendsForGroup.delete(friendId);
      }
      updateSelectedFriendsTags();
    });

    friendItem.appendChild(checkbox);
    friendItem.appendChild(label);
    friendItem.addEventListener('click', () => {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    friendsList.appendChild(friendItem);
  });
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

      tag.querySelector('button')?.addEventListener('click', () => {
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

  // Enable submit button only if at least 1 friend is selected
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = selectedFriendsForGroup.size < 1;
  }
}

async function createGroupChat() {
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  const groupName = groupNameInput?.value.trim();

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

    const response = await fetch('/api/chat/create-group-chat', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: groupName,
        memberIds: memberIds
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create group chat: ${response.statusText}`);
    }

    const { chatId } = await response.json();

    closeFriendSelectionModal();

    // Reload chats and select the new group chat
    await loadChats();
    selectChat(chatId);

    console.log('Group chat created:', chatId);
  } catch (err) {
    console.error('Error creating group chat:', err);
    alert(`Failed to create group chat: ${(err as Error).message}`);
  }
}

// Event listeners setup
export function setupChatEventListeners() {
  // idempotent: prevent attaching listeners multiple times
  if ((window as any).__chat_listeners_attached) return;
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

  // Close modal when clicking outside
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeChatModal();
      }
    });
  }

  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreMessages);
  }

  // Friend selection modal listeners
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
    createGroupSubmitBtn.addEventListener('click', createGroupChat);
  }

  // Close friend selection modal when clicking outside
  const friendModal = document.getElementById('friend-selection-modal');
  if (friendModal) {
    friendModal.addEventListener('click', (e) => {
      if (e.target === friendModal) {
        closeFriendSelectionModal();
      }
    });
  }

  // mark listeners as attached so repeated initializations are safe
  (window as any).__chat_listeners_attached = true;
}
