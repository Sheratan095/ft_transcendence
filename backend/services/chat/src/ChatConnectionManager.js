import { getUsernameById } from './chat-help.js';

// Chat connection manager handles WebSocket connections and message routing
class	ChatConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
		// Cache for usernames to reduce DB lookups 
		//	refresh every time a user sends a message
		this._cachedUsersInRooms = new Map(); // userId -> Username
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		console.log(`[CHAT] User ${userId} connected`);
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

	// Return if the message was delivered to all users in the room
	async	sendToRoom(roomId, senderId, messageId, content, chatDb)
	{
		// Refresh username cache
		const	username = await this.#getUsernameFromCache(senderId, true);

		const	data = {
			roomId: roomId,
			from: username,
			senderId: senderId,
			messageId: messageId,
			content: content,
			timestamp: new Date().toISOString(),
		};

		// Get users in room
		const	userIds = this.getUsersInRoom(roomId)?.map(user => user.userId) || [];
		let		deliveredCount = 0;

		// Send to each user in the room
		for (const userId of userIds)
		{
			const	socket = this._connections.get(userId);
			if (socket)
			{
				this.#dispatchEventToSocket(socket, 'chat.message', data);
				// Create message status as 'delivered' for each connected user
				if (userId !== senderId)
					await chatDb.createMessageStatus(messageId, userId, 'delivered');

				deliveredCount++;
			}
			else if (userId !== senderId) // User not connected
				await chatDb.createMessageStatus(messageId, userId, 'sent');
		}

		return (deliveredCount != userIds.length);
	}

	// Return if the message was delivered to the user
	async	sendToUser(senderId, toUserId, messageId, content, chatDb)
	{
		// Refresh username cache (refresh = true)
		const	senderUsername = await this.#getUsernameFromCache(senderId, true);

		const	data = {
			from: senderUsername,
			senderId: senderId,
			messageId: messageId,
			content: content,
			timestamp: new Date().toISOString(),
		};

		// Check if user is connected to socket
		const	socket = this._connections.get(toUserId);
		if (socket)
		{
			console.log(`[CHAT] Sending private message from user ${senderId} to user ${toUserId}`);
			this.#dispatchEventToSocket(socket, 'chat.private_message', data);
			if (chatDb)
				await chatDb.createMessageStatus(messageId, toUserId, 'delivered');

			return (true);
		}
		else
		{
			console.log(`[CHAT] User ${toUserId} not connected, message is pending (status 'sent')`);
			if (chatDb)
				await chatDb.createMessageStatus(messageId, toUserId, 'sent');

			return (false);
		}
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
	}

	async	replyToMessage(userId, chatId, messageId, status)
	{
		const	socket = this._connections.get(userId);
		const	data = {
			chat_id: chatId,
			message_id: messageId,
			status: status,
		};

		if (socket)
			this.#dispatchEventToSocket(socket, 'chat.messageSent', data);
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
	async	#getUsernameFromCache(userId, refresh=false)
	{
		let	username = this._cachedUsersInRooms.get(userId);
		if (!username || refresh)
		{
			username = await getUsernameById(userId);
			this._cachedUsersInRooms.set(userId, username);
		}

		return (username);
	}

	// async	sendUndeliveredMessages(userId)
	// {
	// 	const	socket = this._connections.get(userId);
	// 	if (!socket)
	// 		return;
	
	// 	const	undeliveredMessages = await chatDb.getUndeliveredMessagesForUser(userId);
	
	// }
}

export const	chatConnectionManager = new ChatConnectionManager();
