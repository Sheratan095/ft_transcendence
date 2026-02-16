import { showInfoToast, showToast, showErrorToast } from '../shared/Toast';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

export let chatSocket: WebSocket | null = null;
export let currentUserId: string | null = null;
export let currentChatId: string | null = null;
export let chats: any[] = [];
export let messages: Map<string, any[]> = new Map();
export let chatMembers: Map<string, any[]> = new Map();
export let unreadCounts: Map<string, number> = new Map();
export let messageOffset = 0;
export const MESSAGE_LIMIT = 50;

// WebSocket connection state management
let isConnecting = false;
let connectionPromise: Promise<WebSocket> | null = null;

// Reconnection parameters
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

// ============================================================================
// STATE SETTERS (for external updates)
// ============================================================================

export function setCurrentUserId(userId: string | null) {
  currentUserId = userId;
}

export function setCurrentChatId(chatId: string | null) {
  currentChatId = chatId;
}

export function setMessageOffset(offset: number) {
  messageOffset = offset;
}

// ============================================================================
// WEBSOCKET CONNECTION MANAGEMENT
// ============================================================================

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
        showInfoToast('Connected to chat', { duration: 3000 });
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

/**
 * Gracefully disconnect the chat WebSocket connection
 */
export function disconnectChatWebSocket(): void {
  if (!chatSocket) {
    return;
  }
  
  console.log('Disconnecting from chat WebSocket');
  // Prevent reconnection attempts when manually disconnecting
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  
  if (chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.close();
  }
  
  chatSocket = null;
  isConnecting = false;
  connectionPromise = null;
}

// ============================================================================
// WEBSOCKET MESSAGE ROUTING
// ============================================================================

function handleWebSocketMessage(data: any) {
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
    case 'chat.joined':
      handleChatJoined(data);
      break;
    case 'pong':
      break;
    case 'error':
      const errPayload = data.data || data;
      console.error('WebSocket error event from server:', errPayload && errPayload.message ? errPayload.message : errPayload);
      showToast(`⚠️ Chat error: ${errPayload?.message || 'See console'}`, 'error', { duration: 4000, position: 'top-right' });
      break;
    default:
      console.warn('Unhandled chat websocket event:', eventName);
  }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

function handleChatMessage(data: any) {
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

  // If the user is currently viewing this chat, re-render messages immediately
  if (String(currentChatId) === String(chatId)) {
    const renderUI = (window as any).__renderMessages;
    if (renderUI) renderUI();
    const scroll = (window as any).__scrollToBottom;
    if (scroll) scroll();
    // mark as read on receipt
    markChatAsRead(chatId).catch(() => {});
  }

  // Show toast notification if not currently viewing this chat
  if (currentChatId !== chatId) {
    const sender = messageData.from || 'Someone';
    const preview = messageData.content.substring(0, 30);
    const displayText = preview.length < messageData.content.length ? `${preview}...` : preview;

    const chat = chats.find(c => c.id === chatId);
    const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';

    showToast(`🗣️ ${chatName}: ${sender} - ${displayText}`, 'info', {
      duration: 0,
      position: 'top-right',
      onClick: () => {
        // Import will be at UI level to avoid circular deps
        const openChat = (window as any).__openChat;
        if (openChat) openChat(chatId);
      }
    });

    const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
    unreadCounts.set(chatId, unreadCount);
  }
}

function handleSystemMessage(data: any) {
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

  // Update chat members for join/leave system events
  const ev = messageData.event || messageData.type || null;
  if (ev === 'userJoin' || ev === 'userLeave') {
    const members = chatMembers.get(chatId) || [];

    if (ev === 'userJoin' && messageData.userId) {
      const exists = members.find((m: any) => String(m.userId) === String(messageData.userId));
      if (!exists) {
        const newMember = { userId: String(messageData.userId), username: messageData.username };
        members.push(newMember);
        chatMembers.set(chatId, members);

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

    // If the current user was removed from this chat and they are viewing it, reset UI
    const removedUserId = messageData.userId ? String(messageData.userId) : null;
    const currentUserRemoved = removedUserId && String(removedUserId) === String(currentUserId);
    const currentMembers = chatMembers.get(chatId) || [];
    const isCurrentUserStillMember = currentMembers.find((m: any) => String(m.userId) === String(currentUserId));
    if ((currentUserRemoved || !isCurrentUserStillMember) && String(currentChatId) === String(chatId)) {
      currentChatId = null;
      // Signal UI to reset
      const resetUI = (window as any).__resetChatUI;
      if (resetUI) resetUI(chatId);
      showToast('You have left this chat', 'info', { duration: 4000, position: 'top-right' });
      return;
    }

    // If not viewing this chat, show a toast
    if (currentChatId !== chatId) {
      const chat = chats.find(c => c.id === chatId);
      const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';
      const emoji = ev === 'userJoin' ? '➕' : '➖';
      showToast(`${emoji} ${chatName}: ${messageData.message}`, 'info', {
        duration: 4000,
        position: 'top-right',
        onClick: () => {
          const openChat = (window as any).__openChat;
          if (openChat) openChat(chatId);
        }
      });

      const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
      unreadCounts.set(chatId, unreadCount);
    }
    return;
  }

  // Generic system messages
  if (currentChatId !== chatId) {
    const chat = chats.find(c => c.id === chatId);
    const chatName = chat ? getChatDisplayName(chat) : 'Group Chat';
    showToast(`📌 ${chatName}: ${messageData.message}`, 'info', {
      duration: 4000,
      position: 'top-right',
      onClick: () => {
        const openChat = (window as any).__openChat;
        if (openChat) openChat(chatId);
      }
    });
    const unreadCount = (unreadCounts.get(chatId) || 0) + 1;
    unreadCounts.set(chatId, unreadCount);
  }
}

function handleMessageSent(data: any) {
  const messageData = data.data || data;
  console.log('Message sent confirmation:', messageData);
  const { messageId, chatId, content, status } = messageData;

  if (!messages.has(chatId)) {
    messages.set(chatId, []);
  }

  const chatMessages = messages.get(chatId)!;
  let existingMessage = chatMessages.find(m =>
    m.content === content &&
    m.senderId === currentUserId &&
    m.id.toString().startsWith('temp_')
  );

  if (existingMessage) {
    existingMessage.id = messageId;
    existingMessage.messageStatus = status;
  } else {
    chatMessages.push({
      id: messageId,
      senderId: currentUserId,
      from: 'You',
      content: content,
      createdAt: new Date().toISOString(),
      messageStatus: status,
      isPrivate: false
    });
  }
}

function handleMessageStatusUpdate(data: any) {
  const messageData = data.data || data;
  console.log('Message status updated:', messageData);
  const { messageId, chatId, status } = messageData;

  if (messages.has(chatId)) {
    const chatMessages = messages.get(chatId)!;
    const message = chatMessages.find(m => m.id === messageId);
    if (message) {
      message.messageStatus = status;
    }
  }
}

function handlePrivateMessage(data: any) {
  const messageData = data.data || data;
  const { chatId, senderId, from, content, timestamp } = messageData;

  if (!senderId) {
    console.warn('Received private message without senderId', messageData);
    showToast('Received private message with missing sender', 'error', { duration: 4000, position: 'top-right' });
    return;
  }

  if (!chatId) {
    console.warn('Received private message without chatId', messageData);
  }

  let dmChat = chats.find(c => c.id === String(chatId));
  console.log('DM chat found:', dmChat);

  if (!dmChat) {
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

  // Show toast if not viewing
  if (currentChatId !== dmChat.id) {
    const preview = content.substring(0, 30);
    const displayText = preview.length < content.length ? `${preview}...` : preview;
    showToast(`💬 ${from}: ${displayText}`, 'info', {
      duration: 3000,
      position: 'top-right',
      onClick: () => {
        const openChat = (window as any).__openChat;
        if (openChat) openChat(dmChat.id);
      }
    });

    const unreadCount = (unreadCounts.get(dmChat.id) || 0) + 1;
    unreadCounts.set(dmChat.id, unreadCount);
  }
      // If viewing this DM, re-render and scroll
      const renderUI = (window as any).__renderMessages;
      if (renderUI) renderUI();
      const scroll = (window as any).__scrollToBottom;
      if (scroll) scroll();
      markChatAsRead(dmChat.id).catch(() => {});
    
}

function handleChatAdded(data: any) {
  const messageData = data.data || data;
  const { chatId, chatName, addedBy } = messageData;

  if (!chatId) {
    console.warn('chat.added missing fields', messageData);
    return;
  }

  showToast(`➕ You've been added to "${chatName}" by ${addedBy}`, 'info', {
    duration: 4000,
    position: 'top-right',
    onClick: () => {
      const openChat = (window as any).__openChat;
      if (openChat) openChat(chatId);
    }
  });

  // Signal UI to refresh chat list if modal is open
  const refreshChats = (window as any).__refreshChatsIfOpen;
  if (refreshChats) refreshChats();
}

function handleChatJoined(data: any) {
  const messageData = data.data || data;
  const { chatId, invitedBy, systemMessage, chatName, timestamp } = messageData;

  if (!chatId) {
    console.warn('chat.joined missing chatId', messageData);
    return;
  }

  // Show a clear toast with an action to open the chat
  showToast(`➕ You've been added to "${chatName || 'a chat'}" by ${invitedBy || 'someone'}`, 'info', {
    duration: 5000,
    position: 'top-right',
    onClick: () => {
      const openChat = (window as any).__openChat;
      if (openChat) openChat(chatId);
    }
  });

  // Refresh chat list so the new chat appears immediately
  const refreshChats = (window as any).__refreshChatsIfOpen;
  if (refreshChats) refreshChats();

  // Optionally, proactively load messages for this chat if the UI chooses to
}

// ============================================================================
// API CALLS
// ============================================================================

export async function loadChats() {
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
        if (chat.chatType === 'dm') {
          const otherMember = chat.members.find((m: any) => String(m.userId) !== String(currentUserId));
          if (otherMember) {
            chat.otherUserId = String(otherMember.userId);
          }
        }
      }
    });
  } catch (err) {
    console.error('Error loading chats:', err);
  }
}

export async function loadMessages(chatId: string, offset = 0) {
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

    if (offset === 0) {
      messages.set(chatId, newMessages.reverse());
    } else {
      const existing = messages.get(chatId) || [];
      messages.set(chatId, [...newMessages.reverse(), ...existing]);
    }

    // Signal UI to render
    const renderUI = (window as any).__renderMessages;
    if (renderUI) renderUI();

    // Show/hide load more button
    const showLoadMore = newMessages.length === MESSAGE_LIMIT;
    const updateLoadBtn = (window as any).__updateLoadMoreBtn;
    if (updateLoadBtn) updateLoadBtn(showLoadMore);

    if (offset === 0) {
      const scroll = (window as any).__scrollToBottom;
      if (scroll) scroll();
    }
  } catch (err) {
    console.error('Error loading messages:', err);
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

  // Signal UI to render
  const renderUI = (window as any).__renderMessages;
  if (renderUI) renderUI();
  const scroll = (window as any).__scrollToBottom;
  if (scroll) scroll();

  let wsMessage;

  if (chat.chatType === 'dm') {
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
    const msg = chatMessages.find(m => m.id === tempMessageId);
    if (msg) {
      msg.messageStatus = 'failed';
      if (renderUI) renderUI();
    }
    return;
  }

  try {
    chatSocket.send(JSON.stringify(wsMessage));
    console.log('Message sent:', wsMessage);
  } catch (err) {
    console.error('Failed to send message:', err);
    const msg = chatMessages.find(m => m.id === tempMessageId);
    if (msg) {
      msg.messageStatus = 'failed';
      if (renderUI) renderUI();
    }
  }
}

export async function sendChatInvite(otherUserId: string) {
  const res = await fetch(`/api/chat/start-private-chat`, {
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'include',
    method: 'POST',
    body: JSON.stringify({ toUserId: otherUserId })
  });
  if (!res.ok) {
    throw new Error(`Failed to send chat invite: ${res.statusText}`);
  }
  const { chatId } = await res.json();

  await loadChats();

  const openChat = (window as any).__openChat;
  if (openChat) openChat(chatId);

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

    // Notify UI to reset if viewing this chat
    if (currentChatId === chatId) {
      currentChatId = null;
      const resetUI = (window as any).__resetChatUI;
      if (resetUI) resetUI(chatId);
      
      // Close the chat modal after leaving
      const closeChatModal = (window as any).__closeChatModal;
      if (closeChatModal) closeChatModal();
    }

    // Signal UI to re-render chat list
    const renderList = (window as any).__renderChatList;
    if (renderList) renderList();

    console.log('Left group chat:', chatId);
  } catch (err) {
    console.error('Error leaving group chat:', err);
    throw err;
  }
}

export async function markChatAsRead(chatId: string) {
  if (!chatId) {
    console.warn('markChatAsRead called with invalid chatId:', chatId);
    return;
  }

  unreadCounts.delete(chatId);

  const renderList = (window as any).__renderChatList;
  if (renderList) renderList();

  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    const message = {
      event: 'chat.read',
      data: { chatId: chatId }
    };
    chatSocket.send(JSON.stringify(message));
  }
}

export async function addUserToChat(chatId: string, toUserId: string) {
  const response = await fetch('/api/chat/add-user', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ chatId, toUserId })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Failed to add user to chat: ${response.statusText}`);
  }
}

export async function createGroupChat(name: string, memberIds: string[]) {
  const response = await fetch('/api/chat/create-group-chat', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name })
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

  // Add members
  for (const memberId of memberIds) {
    try {
      await addUserToChat(chatId, memberId);
    } catch (err) {
      console.error(`Error adding user ${memberId} to group chat:`, err);
      throw err;
    }
  }

  return chatId;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function getChatDisplayName(chat: any): string {
  if (chat.chatType === 'dm') {
    const otherMember = chat.members?.find((m: any) => m.userId !== currentUserId);
    return otherMember ? otherMember.username : 'Unknown User';
  }
  return chat.name || 'Unnamed Chat';
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
