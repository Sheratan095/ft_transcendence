import { getUsernameById, notifyMessageStatusUpdates } from './chat-help.js';

// Chat connection manager handles WebSocket connections and message routing
class	ChatConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
		// Cache for usernames to reduce DB lookups 
		//	refresh every time a user sends a message
		this._cachedUsersInChats = new Map(); // userId -> Username
		this._cachedChatNames = new Map(); // chatId -> chatName
	}

	async	addConnection(userId, socket, chatDb, timestamp)
	{
		this._connections.set(userId, socket);

		// Mark all chat messages as delivered for this user
		const	chats = await chatDb.getChatsForUser(userId);
		for (const chat of chats)
		{
			await chatDb.markMessagesAsDelivered(chat.chat_id, userId, timestamp);
			notifyMessageStatusUpdates(chat.chat_id, timestamp, chatDb);
		}

		console.log(`[CHAT] User ${userId} connected, all messages received are now marked as delivered`);
	}

	removeConnection(userId)
	{
		this._connections.delete(userId);
		console.log(`[CHAT] User ${userId} disconnected`);
	}

	getConnection(userId)
	{
		return (this._connections.get(userId));
	}

	count()
	{
		return (this._connections.size);
	}

	// Return if the message was delivered to all users in the chat
	async	sendMsgToChat(chatId, senderId, messageId, content, chatDb, timestamp)
	{
		// Refresh username cache
		const	username = await this.getUsernameFromCache(senderId, true);

		const	data = {
			chatId: chatId,
			from: username,
			senderId: senderId,
			messageId: messageId,
			content: content,
			timestamp: timestamp,
		};

		await this.#dispatchEventToChat(chatId, data, chatDb, true, 'chat.message', timestamp, senderId);

		const	status = await chatDb.getOverallMessageStatus(messageId);

		return (status);
	}

	// Send system message to chat members
	// excludeUserId: optional user to exclude from receiving the message (e.g., newly added user)
	async	sendUserJoinToChat(chatId, newUserId, newUsername, invitedByUsername, chatDb, timestamp)
	{
		const	message = `User ${newUsername} has been added to the chat by ${invitedByUsername}.`;

		const	messageId = await chatDb.addMessageToChat(chatId, null, message, timestamp, 'user_join');

		const	data = {
			event: 'userJoin',
			chatId: chatId,
			userId: newUserId,
			username: newUsername,
			messageId: messageId,
			message: message,
			timestamp: timestamp,
		};

		await this.#dispatchEventToChat(chatId, data, chatDb, false, 'chat.systemMessage');
	
	}

	async	sendUserLeaveToChat(chatId, leftUserId, leftUsername, chatDb, timestamp)
	{
		const	message = `User ${leftUsername} has left the chat.`;

		const	messageId = await chatDb.addMessageToChat(chatId, null, message, timestamp, 'user_leave');

		const	data = {
			event: 'userLeave',
			chatId: chatId,
			userId: leftUserId,
			username: leftUsername,
			messageId: messageId,
			message: message,
			timestamp: timestamp,
		};

		await this.#dispatchEventToChat(chatId, data, chatDb, false, 'chat.systemMessage');
	}

	// Send chat.joined event to the newly added user
	async	sendChatJoinedToUser(chatId, addedUserId, invitedByUsername, systemMessage, timestamp)
	{
		const	data = {
			chatId: chatId,
			invitedBy: invitedByUsername,
			systemMessage: systemMessage,
			timestamp: timestamp,
		};

		const	socket = this._connections.get(addedUserId);
		this.#dispatchEventToSocket(socket, 'chat.joined', data);

		console.log(`[CHAT] Sent chat.joined event to user ${addedUserId} for chat ${chatId}`);
	}

	// Return if the message was delivered to the user
	async	sendToUser(senderId, toUserId, messageId, content, chatDb, chatId, timestamp)
	{
		// Refresh username cache (refresh = true)
		const	senderUsername = await this.getUsernameFromCache(senderId, true);

		const	data = {
			from: senderUsername,
			senderId: senderId,
			messageId: messageId,
			chatId: chatId,
			content: content,
			timestamp: timestamp,
		};

		// Check if user is connected to socket
		const	socket = this._connections.get(toUserId);
		if (socket)
		{
			console.log(`[CHAT] Sending private message from user ${senderId} to user ${toUserId}`);
			this.#dispatchEventToSocket(socket, 'chat.privateMessage', data);

			await chatDb.createMessageStatus(messageId, toUserId, 'delivered', timestamp);
			await chatDb.createMessageStatus(messageId, senderId, 'read', timestamp); // Status for sender (always read)

			return (true);
		}
		else
		{
			console.log(`[CHAT] User ${toUserId} not connected, message is pending (status 'sent')`);

			await chatDb.createMessageStatus(messageId, toUserId, 'sent', timestamp); // Status for receiver
			await chatDb.createMessageStatus(messageId, senderId, 'read', timestamp); // Status for sender (always read)

			return (false);
		}
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
	}

	async	replyToMessage(userId, chatId, messageId, status, content, chatType, targetName)
	{
		const	socket = this._connections.get(userId);

		const	data = {
			chatId: chatId,
			messageId: messageId,
			content: content,
			status: status,
			name: targetName,
			chatType: chatType,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'chat.messageSent', data);
	}

	async	notifyMessageStatusUpdate(userId, chatId, messageId, status)
	{
		const	socket = this._connections.get(userId);
		const	data = {
			chatId: chatId,
			messageId: messageId,
			overallStatus: status,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'chat.messageStatusUpdate', data);
	}

	async	#dispatchEventToChat(chatId, data, chatDb, createMessageStatus=false, eventType, timestamp=null, excludeUserId=null)
	{
		// Get users in chat
		const	userIds = await chatDb.getUsersInChat(chatId);

		// Send to each user in the chat
		for (const userId of userIds)
		{
			if (excludeUserId && userId === excludeUserId)
				continue;

			const	socket = this._connections.get(userId);
			if (socket)
			{
				this.#dispatchEventToSocket(socket, eventType, data);
				if (createMessageStatus)
				{
					await chatDb.createMessageStatus(
						data.messageId,
						userId,
						"delivered",
						timestamp
					);
					console.log(`[CHAT] Message ${data.messageId} delivered to user ${userId} in chat ${chatId}`);
				}
			}
			else
			{
				if (createMessageStatus)
				{
					await chatDb.createMessageStatus(
						data.messageId,
						userId,
						"sent",
						timestamp
					);
				}
			}
		}
	}

	#dispatchEventToSocket(socket, event, data)
	{
		if (socket)
		{
			try
			{
				socket.send(JSON.stringify({ event, data }));
			}
			catch (e)
			{
				console.error(`[CHAT] Failed to send ${event}:`, e.message);
			}
		}
	}

	// Used also in chat-controllers.js
	async	getUsernameFromCache(userId, refresh=false)
	{
		let	username = this._cachedUsersInChats.get(userId);
		if (!username || refresh)
		{
			username = await getUsernameById(userId);
			this._cachedUsersInChats.set(userId, username);
		}

		return (username);
	}

	async	getGroupChatNameFromCache(chatId, chatDb, refresh=false)
	{
		let	chatName = this._cachedChatNames.get(chatId);
		if (!chatName || refresh)
		{
			chatName = await chatDb.getGroupChatName(chatId);
			this._cachedChatNames.set(chatId, chatName);
		}
		
		return (chatName);
	}
}

export const	chatConnectionManager = new ChatConnectionManager();
