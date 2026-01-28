export interface Chat {
  id: string;
  name?: string;
  chatType: 'dm' | 'group';
  members?: any[];
  otherUserId?: string;
}

export interface Message {
  id?: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp?: number;
  chatId: string;
  messageType?: string;
}

export class ChatManager {
  private chatSocket: WebSocket | null = null;
  private currentUserId: string | null = null;
  private currentChatId: string | null = null;
  private chats: Chat[] = [];
  private messages: Map<string, Message[]> = new Map();
  private chatMembers: Map<string, any[]> = new Map();
  private messageOffset = 0;
  private MESSAGE_LIMIT = 50;

  // Callbacks
  private onChatsLoaded: ((chats: Chat[]) => void) | null = null;
  private onChatSelected: ((chatId: string) => void) | null = null;
  private onMessageReceived: ((message: Message) => void) | null = null;

  constructor(userId: string) {
    this.currentUserId = userId;
  }

  setOnChatsLoaded(callback: (chats: Chat[]) => void) {
    this.onChatsLoaded = callback;
  }

  setOnChatSelected(callback: (chatId: string) => void) {
    this.onChatSelected = callback;
  }

  setOnMessageReceived(callback: (message: Message) => void) {
    this.onMessageReceived = callback;
  }

  async loadChats(): Promise<Chat[]> {
    try {
      const response = await fetch('/api/chat/', {
        method: 'GET',
        credentials: 'include'
      });
      console.log('Load chats response:', response);
      if (!response.ok) {
        throw new Error(`Failed to load chats: ${response.statusText}`);
      }

      this.chats = await response.json();

      // Store members for each chat and extract otherUserId for DM chats
      this.chats.forEach(chat => {
        if (chat.members) {
          this.chatMembers.set(chat.id, chat.members);
          // For DM chats, store the other user's ID directly on the chat object
          if (chat.chatType === 'dm') {
            const otherMember = chat.members.find(m => String(m.userId) !== String(this.currentUserId));
            if (otherMember) {
              chat.otherUserId = String(otherMember.userId);
            }
          }
        }
      });

      if (this.onChatsLoaded) {
        this.onChatsLoaded(this.chats);
      }

      return this.chats;
    } catch (err) {
      console.error('Error loading chats:', err);
      return [];
    }
  }

  async loadMessages(chatId: string, offset = 0): Promise<Message[]> {
    try {
      const response = await fetch(`/api/chat/messages?chatId=${chatId}&limit=${this.MESSAGE_LIMIT}&offset=${offset}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.statusText}`);
      }

      const newMessages = await response.json();

      // Reverse to show oldest first (WhatsApp style)
      if (offset === 0) {
        this.messages.set(chatId, newMessages.reverse());
      } else {
        const existing = this.messages.get(chatId) || [];
        this.messages.set(chatId, [...newMessages.reverse(), ...existing]);
      }

      return this.messages.get(chatId) || [];
    } catch (err) {
      console.error('Error loading messages:', err);
      return [];
    }
  }

  selectChat(chatId: string) {
    this.currentChatId = chatId;
    this.messageOffset = 0;

    const chatHeader = document.getElementById('chat-header');
    if (chatHeader) {
      const chat = this.chats.find(c => c.id === chatId);
      if (chat) {
        chatHeader.textContent = this.getChatDisplayName(chat);
      }
    }

    this.markChatAsRead(chatId);

    if (this.onChatSelected) {
      this.onChatSelected(chatId);
    }
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Don't connect if already connecting or connected
      if (this.chatSocket && this.chatSocket.readyState === WebSocket.CONNECTING) {
        console.log('WebSocket connection already in progress');
        reject(new Error('Connection already in progress'));
        return;
      }

      if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${protocol}://${window.location.host}/chat/ws`;

      this.chatSocket = new WebSocket(url);

      this.chatSocket.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.chatSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'chat.chatMessage') {
          const message: Message = {
            id: data.id,
            senderId: String(data.senderId),
            senderName: data.senderName || 'User',
            content: data.content,
            timestamp: data.timestamp,
            chatId: data.chatId,
            messageType: 'received'
          };

          const msgs = this.messages.get(data.chatId) || [];
          msgs.push(message);
          this.messages.set(data.chatId, msgs);

          if (this.onMessageReceived) {
            this.onMessageReceived(message);
          }
        } else if (data.type === 'chat.privateMessage') {
          const message: Message = {
            id: data.id,
            senderId: String(data.senderId),
            senderName: data.senderName || 'User',
            content: data.content,
            timestamp: data.timestamp,
            chatId: data.chatId,
            messageType: 'private'
          };

          const msgs = this.messages.get(data.chatId) || [];
          msgs.push(message);
          this.messages.set(data.chatId, msgs);

          if (this.onMessageReceived) {
            this.onMessageReceived(message);
          }
        }
      };

      this.chatSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.chatSocket = null;
        reject(error);
      };

      this.chatSocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.chatSocket = null;
      };
    });
  }

  sendMessage(content: string): boolean {
    if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    if (!this.currentChatId) {
      console.error('No chat selected');
      return false;
    }

    const chat = this.chats.find(c => c.id === this.currentChatId);
    if (!chat) return false;

    const message = {
      type: chat.chatType === 'dm' ? 'chat.privateMessage' : 'chat.chatMessage',
      chatId: this.currentChatId,
      recipientId: chat.otherUserId,
      content: content
    };

    this.chatSocket.send(JSON.stringify(message));

    // Add message to local state
    const msgs = this.messages.get(this.currentChatId) || [];
    msgs.push({
      senderId: this.currentUserId || '',
      content: content,
      chatId: this.currentChatId,
      messageType: 'sent'
    });
    this.messages.set(this.currentChatId, msgs);

    return true;
  }

  private getChatDisplayName(chat: Chat): string {
    if (chat.chatType === 'dm' && chat.otherUserId) {
      const members = this.chatMembers.get(chat.id) || [];
      const otherMember = members.find(m => String(m.userId) === chat.otherUserId);
      return otherMember?.username || 'User';
    }
    return chat.name || 'Group Chat';
  }

  private markChatAsRead(chatId: string) {
    if (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN) return;

    const message = { type: 'chat.read', chatId };
    this.chatSocket.send(JSON.stringify(message));
  }

  getChats(): Chat[] {
    return this.chats;
  }

  getCurrentChatId(): string | null {
    return this.currentChatId;
  }

  getMessages(chatId: string): Message[] {
    return this.messages.get(chatId) || [];
  }

  closeWebSocket() {
    if (this.chatSocket) {
      this.chatSocket.close();
      this.chatSocket = null;
    }
    this.currentChatId = null;
  }

  isWebSocketConnected(): boolean {
    return this.chatSocket !== null && this.chatSocket.readyState === WebSocket.OPEN;
  }
}
