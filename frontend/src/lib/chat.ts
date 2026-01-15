let chatSocket: WebSocket | null = null;
let currentUserId: string | null = null;
let currentChatId: string | null = null;
let chats: any[] = [];
let messages: Map<string, any[]> = new Map();
let chatMembers: Map<string, any[]> = new Map();
let messageOffset = 0;
const MESSAGE_LIMIT = 50;

export function initChat(userId: string) {
  currentUserId = userId;
}

export async function openChatModal() {
  const modal = document.getElementById('chat-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  // Load chats if not already loaded
  if (chats.length === 0) {
    await loadChats();
  }

  // Connect to WebSocket if not already connected
  if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
    connectChatWebSocket();
  }
  // Render chat list
  renderChatList();
}

export function closeChatModal() {
  const modal = document.getElementById('chat-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  // Close WebSocket
  if (chatSocket) {
    chatSocket.close();
    chatSocket = null;
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
          const otherMember = chat.members.find(m => String(m.userId) !== String(currentUserId));
          if (otherMember) {
            chat.otherUserId = String(otherMember.userId);
          }
        }
      }
    });

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
    chatItem.onclick = () => selectChat(chat.id);

    const chatName = document.createElement('div');
    chatName.className = 'chat-item-name';
    chatName.textContent = getChatDisplayName(chat);

    const chatType = document.createElement('div');
    chatType.className = 'chat-item-type';
    chatType.textContent = chat.chatType === 'dm' ? 'Direct Message' : 'Group Chat';

    chatItem.appendChild(chatName);
    chatItem.appendChild(chatType);
    chatList.appendChild(chatItem);
  });
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
  await loadMessages(chatId, 0);

  // Update chat header
  const chatHeader = document.getElementById('chat-header');
  if (chatHeader) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      chatHeader.textContent = getChatDisplayName(chat);
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
    console.log('Loaded messages from API:', newMessages);

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
  await loadMessages(currentChatId, messageOffset);
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

  chatMessages.forEach(msg => {
    const messageDiv = document.createElement('div');
    // Handle both snake_case (from API) and camelCase (from WebSocket)
    const senderId = msg.senderId || msg.sender_id;
    const createdAt = msg.createdAt || msg.created_at;
    const messageStatus = msg.messageStatus || msg.message_status;
    const isPrivate = msg.isPrivate || false;
    const isSystem = msg.isSystem || senderId === 'system' || senderId === null;

    // Handle system messages
    if (isSystem) {
      messageDiv.className = 'message message-system';
      messageDiv.innerHTML = `<div class="message-content">${escapeHtml(msg.content)}</div>`;
      messagesContainer.appendChild(messageDiv);
      return;
    }

    // Compare as strings since backend returns string IDs
    const isSent = String(senderId) === String(currentUserId);

    console.log('Message:', {
      senderId,
      currentUserId,
      isSent,
      isPrivate,
      senderIdType: typeof senderId,
      userIdType: typeof currentUserId
    });

    // Determine message class based on type and sender
    let messageClass = 'message ';
    if (isPrivate) {
      messageClass += isSent ? 'message-private-sent' : 'message-private-received';
    } else {
      messageClass += isSent ? 'message-sent' : 'message-received';
    }
    messageDiv.className = messageClass;

    let statusText = '';
    if (isSent && messageStatus) {
      statusText = `<span class="message-status">${messageStatus}</span>`;
    }

    let privateBadge = '';
    if (isPrivate) {
      privateBadge = '<div class="message-private-badge">🔒 Private Message</div>';
    }

    messageDiv.innerHTML = `
      ${privateBadge}
      ${!isSent ? `<div class="message-header">Sender: ${escapeHtml(msg.from || senderId)}</div>` : ''}
      <div class="message-content">${escapeHtml(msg.content)}</div>
      <div class="message-footer">
        <span>${new Date(createdAt).toLocaleTimeString()}</span>
        ${statusText}
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
  });
}

export function scrollToBottom() {
  const messagesContainer = document.getElementById('chat-messages');
  if (messagesContainer) {
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 0);
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function connectChatWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/chat/ws`;

  console.log('Connecting to chat WebSocket at', wsUrl);
  chatSocket = new WebSocket(wsUrl);

  chatSocket.addEventListener('open', () => {
    console.log('Chat WebSocket connected');
  });

  chatSocket.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  });

  chatSocket.addEventListener('close', () => {
    console.log('Chat WebSocket closed');
  });

  chatSocket.addEventListener('error', (error) => {
    console.error('Chat WebSocket error:', error);
  });
}

function handleWebSocketMessage(data: any) {
  console.log('Received WebSocket message:', data);

  if (data.event === 'chat.message') {
    handleChatMessage(data);
  } else if (data.event === 'chat.systemMessage') {
    handleSystemMessage(data);
  } else if (data.event === 'chat.messageSent') {
    handleMessageSent(data);
  } else if (data.event === 'chat.messageStatusUpdate') {
    handleMessageStatusUpdate(data);
  } else if (data.event === 'chat.privateMessage') {
    handlePrivateMessage(data);
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

  if (currentChatId === chatId) {
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
  }
}

function handleMessageSent(data: any) {
  console.log('Message sent confirmation:', data);
  const { messageId, chatId, timestamp } = data;
  
  // Update message status to 'sent' if it exists
  if (messages.has(chatId)) {
    const chatMessages = messages.get(chatId)!;
    const message = chatMessages.find(m => m.id === messageId);
    if (message) {
      message.messageStatus = 'sent';
      if (currentChatId === chatId) {
        renderMessages();
      }
    }
  }
}

function handleMessageStatusUpdate(data: any) {
  console.log('Message status updated:', data);
  const { messageId, chatId, status } = data;
  
  // Update message status
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
  console.log('Private message received:', data);
  const { fromUserId, from, content, timestamp } = data;
  
  // Find or create a DM chat with this user
  let dmChat = chats.find(c => c.chatType === 'dm' && c.otherUserId === String(fromUserId));
  
  if (!dmChat) {
    // Create a new DM chat entry
    dmChat = {
      id: `dm_${fromUserId}`,
      chatType: 'dm',
      otherUserId: String(fromUserId),
      members: [
        { userId: fromUserId, username: from },
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
    id: data.messageId || `msg_${Date.now()}`,
    senderId: String(fromUserId),
    from: from,
    content: content,
    createdAt: timestamp,
    messageStatus: 'delivered',
    isPrivate: true
  });
  
  // Re-render if this chat is currently open
  if (currentChatId === dmChat.id) {
    renderMessages();
    scrollToBottom();
  }
  
  // Update chat list to show the new/updated chat
  renderChatList();
}

function markChatAsRead(chatId: string) {
  if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    const message = {
      event: 'chat.read',
      data: { chatId: chatId }
    };
    chatSocket.send(JSON.stringify(message));
  }
}

export async function sendChatInvite(otherUserId: string) {
      const res = await fetch(`api/chat/start-private-chat`, {
      credentials: 'include',
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Failed to send chat invite: ${res.statusText}`);
    }
    const chatId = await res.json();
    openChatModal();
    selectChat(chatId);
    console.log('Private chat started:', chatId);
}

export async function sendChatMessage(message: string) {
  if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
    console.error('Not connected to chat or no chat selected');
    return;
  }

  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) {
    console.error('Chat not found');
    return;
  }

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

  chatSocket.send(JSON.stringify(wsMessage));
  if (currentChatId)
    await loadMessages(currentChatId, 0);
  renderMessages();
  scrollToBottom();
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

// Event listeners setup
export function setupChatEventListeners() {
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
}
