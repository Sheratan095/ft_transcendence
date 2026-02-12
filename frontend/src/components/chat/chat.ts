import { showInfoToast, showToast, showErrorToast } from '../shared/Toast';
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

// WebSocket connection state management
let isConnecting = false;
let connectionPromise: Promise<WebSocket> | null = null;

export function initChat(userId: string) {
  currentUserId = userId;
  // Ensure only one connection is established at startup
  connectChatWebSocket().catch(err => console.error('Failed to establish chat connection:', err));
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

  // Clear chat header and messages to reflect no selection
  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) chatHeader.textContent = 'Select a chat';

  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) chatMessages.innerHTML = '';

  const leaveGroupBtn = document.getElementById('leave-group-btn');
  if (leaveGroupBtn) leaveGroupBtn.classList.add('hidden');

  const addUserBtn = document.getElementById('add-user-btn');
  if (addUserBtn) addUserBtn.classList.add('hidden');

  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) loadMoreBtn.style.display = 'none';

  // Re-render chat list to remove any active highlight
  renderChatList();
  updateChatControls();
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

    // Do not auto-select a chat when loading the list; keep currentChatId as-is
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
    chatItem.id = `chat-item-${chat.id}`;
    chatItem.className = 'chat-item cursor-pointer';
    if (getCurrentTheme() === 'dark') {
      chatItem.classList.add('dark');
    }
    if (String(currentChatId) === String(chat.id)) {
      chatItem.classList.add('active', 'border-accent-green', 'border-2', 'rounded', 'p-2');
      chatItem.setAttribute('aria-selected', 'true');
    } else {
      chatItem.setAttribute('aria-selected', 'false');
    }
    chatItem.onclick = () => {
      selectChat(chat.id);
    };

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
    // Ensure the active chat is visible in the list
    if (String(currentChatId) === String(chat.id)) {
      setTimeout(() => {
        chatItem.scrollIntoView({ block: 'nearest' });
      }, 0);
    }
  });

  // Do not auto-select the first chat on render; preserve existing selection (or none)
  updateChatControls();
}

function updateChatControls() {
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const sendBtn = document.getElementById('chat-send-btn') as HTMLButtonElement | null;

  const enabled = !!currentChatId;

  if (input) {
    input.disabled = !enabled;
    input.placeholder = enabled ? 'Type a message...' : 'Select a chat to start messaging';
  }

  if (sendBtn) {
    sendBtn.disabled = !enabled;
  }
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
  if (!chatId) {
    console.warn('selectChat called with invalid chatId:', chatId);
    return;
  }
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
  let addUserBtn = document.getElementById('add-user-btn');
  if (chatHeader && leaveGroupBtn) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chatHeader.textContent = getChatDisplayName(chat);
      // Show leave group button only for group chats
      if (chat.chatType === 'group') {
        leaveGroupBtn.classList.remove('hidden');
        // ensure add-user button exists and is visible
        if (!addUserBtn) {
          addUserBtn = document.createElement('button');
          addUserBtn.id = 'add-user-btn';
          addUserBtn.className = 'ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm';
          addUserBtn.textContent = 'Add User';
          addUserBtn.addEventListener('click', () => {
            addToChatId = chatId;
            openFriendSelectionModal();
          });
          // insert the add button next to leave button
          leaveGroupBtn.parentElement?.insertBefore(addUserBtn, leaveGroupBtn.nextSibling);
        } else {
          addUserBtn.classList.remove('hidden');
        }
      } else {
        leaveGroupBtn.classList.add('hidden');
        if (addUserBtn) addUserBtn.classList.add('hidden');
      }
    }
  }

  // Mark as read
  markChatAsRead(chatId);
  scrollToBottom();
}

async function loadMessages(chatId: string, offset = 0) {
  if (!chatId) {
    console.warn('loadMessages called with invalid chatId:', chatId);
    return;
  }
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
      messageDiv.className = 'message message-system text-center mx-auto bg-blue-600 text-white italic px-3 py-2 rounded-md max-w-[80%]';
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

    // Determine a human-friendly display name: prefer `msg.from`, then any cached member username, then senderId
    const membersForChat = chatMembers.get(currentChatId || '') || [];
    const matchedMember = membersForChat.find((m: any) => String(m.userId) === String(senderId));
    const displayName = msg.from || (matchedMember && matchedMember.username) || (msg.senderName) || senderId;

    messageDiv.innerHTML = `
      ${!isSent ? `<div class="message-header text-xs opacity-75">from ${escapeHtml(displayName)}</div>` : ''}
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

/**
 * Establishes a single persistent WebSocket connection for chat
 * Uses a singleton pattern to ensure only one connection exists
 */
export function connectChatWebSocket(): Promise<WebSocket> {
  // Return existing connection if already open
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    console.log('Chat WebSocket already connected');
    return Promise.resolve(chatSocket);
  }

  // If connecting is in progress, return the existing promise to avoid multiple concurrent attempts
  if (isConnecting && connectionPromise) {
    console.log('Connection already in progress, returning cached promise');
    return connectionPromise;
  }

  // Set flag to indicate connection is starting
  isConnecting = true;

  const wsUrl = `/chat/ws`;
  console.log('Establishing chat WebSocket connection at', wsUrl);

  connectionPromise = new Promise((resolve, reject) => {
    try {
      const socket = new WebSocket(wsUrl);
      chatSocket = socket;

      socket.onopen = () => {
        console.log('✅ Chat WebSocket successfully connected');
        showInfoToast('Connected to chat', { duration: 3000});
        isConnecting = false;
        reconnectAttempts = 0; // Reset on successful connection
        connectionPromise = null;
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
        console.error('❌ Chat WebSocket error', event);
        showErrorToast('Chat WebSocket error', { duration: 4000, position: 'top-right' });
        isConnecting = false;
        connectionPromise = null;
        reject(event);
      };

      socket.onclose = () => {
        console.warn('⚠️ Chat WebSocket closed');
        showErrorToast('⚠️ Chat disconnected', { duration: 4000, position: 'top-right' });
        isConnecting = false;
        connectionPromise = null;
        chatSocket = null;
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delayMs = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${Math.round(delayMs)}ms`);
          setTimeout(() => {
            connectChatWebSocket().catch(err => console.error('Reconnection failed:', err));
          }, delayMs);
        } else {
          console.error('❌ Max reconnection attempts reached');
          showErrorToast('❌ Chat disconnected (could not reconnect)', { duration: 5000, position: 'top-right' });
        }
      };
    } catch (error) {
      console.error('Connection initialization error:', error);
      isConnecting = false;
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
}

function handleWebSocketMessage(data: any) {

  // Normalize incoming message formats from different server implementations.
  // Some servers use { event: 'name', ... } while others use { type: 'name', ... }
  const eventName = data?.event || data?.type || data?.typeName || null;
  if (!eventName) {
    console.warn('Unknown WebSocket message format, ignoring', data);
    return;
  }

  switch (eventName) {
    case 'chat.message':
      console.log('Received deprecated chat.message event, handling as chat.chatMessage for compatibility');
      handleChatMessage(data);
      break;
    case 'chat.chatMessage':
      handleChatMessage(data);
      break;
    case 'chat.systemMessage':
    case 'chat.sytemMessage':
      // accept both correct and misspelled event names
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
    case 'chat.added':
      handleChatAdded(data);
      break;
    case 'pong':
      // keep-alive/ping response from server; ignore or use for metrics
      // console.log('Received pong from server', data);
      break;
    case 'error':
      // Server-side error event (payload in data.data or data)
      const errPayload = data.data || data;
      console.error('WebSocket error event from server:', errPayload && errPayload.message ? errPayload.message : errPayload);
      showToast(`⚠️ Chat error: ${errPayload?.message || 'See console'}`, 'error', { duration: 4000, position: 'top-right' });
      break;
    default:
      console.warn('Unhandled chat websocket event:', eventName);
  }
}

function handleChatMessage(data: any) {
  // Handle both flat and nested data structures
  const messageData = data.data || data;
  const chatId = messageData.chatId;

  if (!chatId) {
    console.warn('Received chat message without chatId', messageData);
    showToast('Received message for unknown chat (missing chatId)', 'error', { duration: 4000, position: 'top-right' });
    return;
  }

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }

  const chatMessages = messages.get(chatId)!;
  chatMessages.push({
    id: messageData.messageId,
    senderId: String(messageData.senderId),
    from: messageData.from,
    content: messageData.content,
    createdAt: messageData.timestamp,
    messageStatus: messageData.messageStatus || 'sent',
    isPrivate: false
  });

  // Show toast notification if not currently viewing this chat
  if (currentChatId !== chatId) {
    const sender = messageData.from || 'Someone';
    const preview = messageData.content.substring(0, 30);
    const displayText = preview.length < messageData.content.length ? `${preview}...` : preview;
    
    // Get chat name for better context
    const chat = chats.find(c => c.id === chatId);
    const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';
    
    showToast(`🗣️ ${chatName}: ${sender} - ${displayText}`, 'info', {
      duration: 0,
      position: 'top-right',
      actions: [
        {
          label: 'Open',
          onClick: () => {
            openChatModal();
            selectChat(chatId);
          },
          style: 'primary'
        }
      ]
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
  // Handle both flat and nested data structures
  const messageData = data.data || data;
  const chatId = messageData.chatId;

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }

  const chatMessages = messages.get(chatId)!;
  chatMessages.push({
    id: messageData.messageId,
    senderId: 'system',
    content: messageData.message,
    createdAt: messageData.timestamp,
    isSystem: true
  });
  // Update chat members for join/leave system events if present
  const ev = messageData.event || messageData.type || null;
  if (ev === 'userJoin' || ev === 'userLeave') {
    const members = chatMembers.get(chatId) || [];

    if (ev === 'userJoin' && messageData.userId) {
      const exists = members.find((m: any) => String(m.userId) === String(messageData.userId));
      if (!exists) {
        const newMember = { userId: String(messageData.userId), username: messageData.username };
        members.push(newMember);
        chatMembers.set(chatId, members);

        // update in chats array if present
        const chatObj = chats.find(c => c.id === chatId);
        if (chatObj) {
          chatObj.members = chatObj.members ? [...chatObj.members, newMember] : [newMember];
        }
      }
    }

    if (ev === 'userLeave' && messageData.userId) {
      const updated = members.filter((m: any) => String(m.userId) !== String(messageData.userId));
      chatMembers.set(chatId, updated);

      const chatObj = chats.find(c => c.id === chatId);
      if (chatObj && chatObj.members) chatObj.members = chatObj.members.filter((m: any) => String(m.userId) !== String(messageData.userId));
    }

    // If the current user was removed from this chat, and they are currently viewing it,
    // reset the chat header and selection back to the default "Select a chat" state.
    const removedUserId = messageData.userId ? String(messageData.userId) : null;
    const currentUserRemoved = removedUserId && String(removedUserId) === String(currentUserId);
    const currentMembers = chatMembers.get(chatId) || [];
    const isCurrentUserStillMember = currentMembers.find((m: any) => String(m.userId) === String(currentUserId));
    if ((currentUserRemoved || !isCurrentUserStillMember) && String(currentChatId) === String(chatId)) {
      currentChatId = null;
      const chatHeaderEl = document.getElementById('chat-header');
      if (chatHeaderEl) chatHeaderEl.textContent = 'Select a chat';
      const chatMessagesEl = document.getElementById('chat-messages');
      if (chatMessagesEl) chatMessagesEl.innerHTML = '';
      const leaveBtn = document.getElementById('leave-group-btn');
      if (leaveBtn) leaveBtn.classList.add('hidden');
      const addBtn = document.getElementById('add-user-btn');
      if (addBtn) addBtn.classList.add('hidden');
      updateChatControls();
      renderChatList();
      showToast('You have left this chat', 'info', { duration: 4000, position: 'top-right' });
      return;
    }
    // If not viewing this chat, show a toast and mark unread
    if (currentChatId !== chatId) {
      const chat = chats.find(c => c.id === chatId);
      const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';
      const emoji = ev === 'userJoin' ? '➕' : '➖';
      showToast(`${emoji} ${chatName}: ${messageData.message}`, 'info', {
        duration: 4000,
        position: 'top-right',
        actions: [
          {
            label: 'View',
            onClick: () => {
              openChatModal();
              selectChat(chatId);
            },
            style: 'primary'
          }
        ]
      });

      const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
      unreadCounts.set(chatId, unreadCount);
      renderChatList();
    } else {
      // currently viewing -> refresh messages and member list
      renderMessages();
      scrollToBottom();
      renderChatList();
    }
    return;
  }

  // Generic system messages: show in current chat or toast otherwise
  if (currentChatId === chatId) {
    renderMessages();
    scrollToBottom();
  } else {
    const chat = chats.find(c => c.id === chatId);
    const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';
    showToast(`📌 ${chatName}: ${messageData.message}`, 'info', { duration: 4000, position: 'top-right', actions: [{ label: 'View', onClick: () => { openChatModal(); selectChat(chatId); }, style: 'primary' }] });
    const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
    unreadCounts.set(chatId, unreadCount);
    renderChatList();
  }
}

function handleMessageSent(data: any) {
  // Handle both flat and nested data structures
  const messageData = data.data || data;
  console.log('Message sent confirmation:', messageData);
  const { messageId, chatId, content, status, name, chatType } = messageData;
  
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
  // Handle both flat and nested data structures
  const messageData = data.data || data;
  console.log('Message status updated:', messageData);
  const { messageId, chatId, status } = messageData;
  
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
  if (!senderId) {
    console.warn('Received private message without senderId', messageData);
    showToast('Received private message with missing sender', 'error', { duration: 4000, position: 'top-right' });
    return;
  }
  if (!chatId) {
    console.warn('Received private message without chatId', messageData);
    // create a DM entry using senderId as fallback chat id
    const fallbackId = `dm_${senderId}_${Date.now()}`;
    messageData.chatId = fallbackId;
  }
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
      duration: 3000,
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

function handleChatAdded(data: any) {
  const messageData = data.data || data;
  const { chatId, chatName, addedBy } = messageData;
  if (!chatId) {
    console.warn('chat.added missing fields', messageData);
    return;
  }
  // Notify user and allow clicking the toast to view the chat
  showToast(`➕ You've been added to "${chatName}" by ${addedBy}`, 'info', { duration: 4000, position: 'top-right', onClick: () => { openChatModal(); selectChat(chatId); } });

  // If the chat modal is currently open, refresh the chat list so the new chat appears
  const chatModal = document.getElementById('chat-modal');
  if (chatModal && !chatModal.classList.contains('hidden')) {
    loadChats().then(() => {
      // Keep current selection unchanged; just re-render the list
      renderChatList();
    }).catch(err => console.error('Failed to refresh chats on chat.added', err));
  } else {
    // If modal is closed, still update in-memory list if possible and re-render badges
    renderChatList();
  }
}

function markChatAsRead(chatId: string) {
  if (!chatId) {
    console.warn('markChatAsRead called with invalid chatId:', chatId);
    return;
  }
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
      // Hide header action buttons and update controls
      const leaveBtn = document.getElementById('leave-group-btn');
      if (leaveBtn) leaveBtn.classList.add('hidden');
      const addBtn = document.getElementById('add-user-btn');
      if (addBtn) addBtn.classList.add('hidden');
      updateChatControls();
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
// If set, the friend-selection modal is being used to add users to this existing chat
let addToChatId: string | null = null;

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

  // If adding to an existing chat, refresh chats/members to ensure left users are reflected
  if (addToChatId) {
    try {
      await loadChats();
    } catch (err) {
      console.error('Failed to refresh chats before opening add-user modal', err);
    }
  }

  modal.classList.remove('hidden');
  selectedFriendsForGroup.clear();

  // If this modal was opened to add users to an existing chat, update submit button text
  const createGroupSubmitBtn = document.getElementById('create-group-submit-btn') as HTMLButtonElement | null;
  if (createGroupSubmitBtn) {
    createGroupSubmitBtn.textContent = addToChatId ? 'Add Selected' : 'Create Group';
  }

  // Reset the form (only the group name when creating a group)
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  if (groupNameInput && !addToChatId) {
    groupNameInput.value = '';
  }

  renderFriendsList();

  // If opened in "add to existing chat" mode, hide group-creation fields
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

  // Update modal header/description based on mode
  const header = modal.querySelector('h2') as HTMLElement | null;
  const desc = modal.querySelector('p') as HTMLElement | null;
  if (addToChatId) {
    if (header) header.textContent = 'Add Users to Chat';
    if (desc) desc.textContent = 'Select friends to add to this chat:';
  } else {
    if (header) header.textContent = 'Create Group Chat';
    if (desc) desc.textContent = 'Select friends to add to the group (at least 2):';
  }
}

function closeFriendSelectionModal() {
  const modal = document.getElementById('friend-selection-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  selectedFriendsForGroup.clear();
  // reset add-to-chat mode
  addToChatId = null;
  const createGroupSubmitBtn = document.getElementById('create-group-submit-btn') as HTMLButtonElement | null;
  if (createGroupSubmitBtn) createGroupSubmitBtn.textContent = 'Create Group';
  // restore any hidden UI
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  if (groupNameInput && groupNameInput.parentElement) groupNameInput.parentElement.style.display = '';
  const selectedTags = document.getElementById('selected-friends-tags');
  const selectedCount = document.getElementById('selected-count');
  if (selectedTags) selectedTags.style.display = '';
  if (selectedCount) selectedCount.style.display = '';
  // restore default header/description using the existing modal variable
  if (modal) {
    const header = modal.querySelector('h2') as HTMLElement | null;
    const desc = modal.querySelector('p') as HTMLElement | null;
    if (header) header.textContent = 'Create Group Chat';
    if (desc) desc.textContent = 'Select friends to add to the group (at least 2):';
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

  // If adding to an existing chat, filter out friends who are already members
  let friendsToShow = friends;
  if (addToChatId) {
    const existing = new Set<string>();
    const members = chatMembers.get(addToChatId) || (chats.find(c => c.id === addToChatId)?.members || []);
    members.forEach((m: any) => existing.add(String(m.userId)));
    // also exclude the current user just in case
    if (currentUserId) existing.add(String(currentUserId));
    friendsToShow = friends.filter(f => !existing.has(String(f.id || f.userId)));
  }

  if (friendsToShow.length === 0) {
    friendsList.innerHTML = '<div class="text-neutral-400 text-center">No friends available to add</div>';
    return;
  }

  friendsToShow.forEach(friend => {
    const friendId = String(friend.id || friend.userId);
    const friendName = friend.username || friend.name || 'Unknown';

    const friendItem = document.createElement('div');
    friendItem.className = 'flex items-center gap-3 p-3 hover:bg-neutral-700 rounded-md cursor-pointer transition';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'w-4 h-4 cursor-pointer';
    checkbox.checked = selectedFriendsForGroup.has(friendId);
    checkbox.setAttribute('data-friend-id', friendId);
    
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

  // Enable submit button only if at least 1 friend is selected
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = selectedFriendsForGroup.size < 1;
  }
}

async function createGroupChat() {
  const groupNameInput = document.getElementById('group-name-input') as HTMLInputElement;
  const groupName = groupNameInput?.value.trim();

  if (addToChatId) {
    // We're in "add users to existing chat" mode
    if (selectedFriendsForGroup.size < 1) {
      alert('Please select at least one friend to add');
      return;
    }

    const memberIds = Array.from(selectedFriendsForGroup);
    try {
      for (const memberId of memberIds) {
        try {
          const response = await fetch('/api/chat/add-user', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ chatId: addToChatId, toUserId: memberId })
          });
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to add user ${memberId} to chat: ${response.statusText}`);
          }
        } catch (err) {
          console.error(`Error adding user ${memberId} to chat:`, err);
          alert(`Failed to add user ${memberId} to chat: ${(err as Error).message}`);
        }
      }

      // Refresh chats and members, then select the chat
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

  // Create new group chat flow
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
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create group chat: ${response.statusText}`);
    }

    const createRes = await response.json();
    const chatId = createRes.chatId || createRes.chat_id || createRes.id;
    if (!chatId) {
      throw new Error('Create group chat response did not include chatId');
    }

    for (const memberId of memberIds) {
      try {
        const response = await fetch('/api/chat/add-user', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ chatId: chatId, toUserId: memberId })
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `Failed to add user ${memberId} to group chat: ${response.statusText}`);
        }
      } catch (err) {
        console.error(`Error adding user ${memberId} to group chat:`, err);
        alert(`Failed to add user ${memberId} to group chat: ${(err as Error).message}`);
      }
    }

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
