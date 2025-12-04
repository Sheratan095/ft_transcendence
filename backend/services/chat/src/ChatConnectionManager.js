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
	}

	async	addConnection(userId, socket, chatDb)
	{
		this._connections.set(userId, socket);

		// Mark all chat messages as delivered for this user
		const	chats = await chatDb.getChatsForUser(userId);
		for (const chat of chats)
		{
			const	timestamp = await chatDb.markMessagesAsDelivered(chat.chat_id, userId);
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
	async	sendMsgToChat(chatId, senderId, messageId, content, chatDb)
	{
		// Refresh username cache
		const	username = await this.getUsernameFromCache(senderId, true);

		const	data = {
			chatId: chatId,
			from: username,
			senderId: senderId,
			messageId: messageId,
			content: content,
			timestamp: new Date().toISOString(),
		};

		// Get users in chat
		const	userIds = await chatDb.getUsersInChat(chatId);

		// Send to each user in the chat
		for (const userId of userIds)
		{
			const	socket = this._connections.get(userId);
			if (socket)
			{
				this.#dispatchEventToSocket(socket, 'chat.message', data);
				// Create message status as 'delivered' for each connected user

				// Add the row also for the sender as 'read'
				await chatDb.createMessageStatus(
					messageId,
					userId,
					userId === senderId ? "read" : "delivered"
				);
			}
			else
			{
				// Add the message to db as sent for offline users
				//	and as read for the sender anyway
				await chatDb.createMessageStatus(
					messageId,
					userId,
					userId === senderId ? "read" : "sent"
				);
			}
		}

		const	status = await chatDb.getOverallMessageStatus(messageId);
		console.log(`[CHAT] Message ${messageId} in chat ${chatId} has overall status: ${status}`);

		return (status);
	}

	// Send system message to chat members
	// excludeUserId: optional user to exclude from receiving the message (e.g., newly added user)
	async	sendSystemMsgToChat(messageId, chatId, message, chatDb, excludeUserId = null)
	{
		const	data = {
			chatId: chatId,
			message: message,
			timestamp: new Date().toISOString(),
		};

		// Get users in chat
		const	userIds = await chatDb.getUsersInChat(chatId);

		// Send to each user in the chat (except excluded user)
		for (const userId of userIds)
		{
			if (excludeUserId && String(userId) === String(excludeUserId))
				continue;

			const	socket = this._connections.get(userId);
			this.#dispatchEventToSocket(socket, 'chat.systemMessage', data);
		}

		console.log(`[CHAT] System message ${messageId} in chat ${chatId}`);
	}

	// Send chat.joined event to the newly added user
	async	sendChatJoinedToUser(chatId, addedUserId, invitedByUsername, systemMessage)
	{
		const	data = {
			chatId: chatId,
			invitedBy: invitedByUsername,
			systemMessage: systemMessage,
			timestamp: new Date().toISOString(),
		};

		const	socket = this._connections.get(addedUserId);
		this.#dispatchEventToSocket(socket, 'chat.joined', data);

		console.log(`[CHAT] Sent chat.joined event to user ${addedUserId} for chat ${chatId}`);
	}

	// Return if the message was delivered to the user
	async	sendToUser(senderId, toUserId, messageId, content, chatDb, chatId)
	{
		// Refresh username cache (refresh = true)
		const	senderUsername = await this.getUsernameFromCache(senderId, true);

		const	data = {
			from: senderUsername,
			senderId: senderId,
			messageId: messageId,
			chatId: chatId,
			content: content,
			timestamp: new Date().toISOString(),
		};

		// Check if user is connected to socket
		const	socket = this._connections.get(toUserId);
		if (socket)
		{
			console.log(`[CHAT] Sending private message from user ${senderId} to user ${toUserId}`);
			this.#dispatchEventToSocket(socket, 'chat.privateMessage', data);

			await chatDb.createMessageStatus(messageId, toUserId, 'delivered');
			await chatDb.createMessageStatus(messageId, senderId, 'read'); // Status for sender (always read)

			return (true);
		}
		else
		{
			console.log(`[CHAT] User ${toUserId} not connected, message is pending (status 'sent')`);

			await chatDb.createMessageStatus(messageId, toUserId, 'sent'); // Status for receiver
			await chatDb.createMessageStatus(messageId, senderId, 'read'); // Status for sender (always read)

			return (false);
		}
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
	}

	async	replyToMessage(userId, chatId, messageId, status, content, chatType)
	{
		const	socket = this._connections.get(userId);
		const	data = {
			chatId: chatId,
			messageId: messageId,
			content: content,
			status: status,
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
}

export const	chatConnectionManager = new ChatConnectionManager();
