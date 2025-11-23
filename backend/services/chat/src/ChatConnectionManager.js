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

	async	sendToRoom(roomId, roomName, userIds, message)
	{
		// Refresh username cache
		const	username = await this.#getUsernameFromCache(userId, refresh=true);

		const	data = {
			roomId: roomId,
			roomName: roomName,
			from: username,
			message : message,
			timestamp: new Date().toISOString(),
		};

		// Check it user is connected to socket
		// TO DO store undelivered messages for offline users
		for (const userId of userIds)
		{
			const	socket = this._connections.get(userId);
			if (socket)
				this.#dispatchEventToSocket(socket, 'chat.message', data);
		}
	}

	async	sendToUser(userId, toUserId, message)
	{
		// Refresh username cache (refresh = true)
		const	senderUsername = await this.#getUsernameFromCache(userId, true);

		const	data = {
			from: senderUsername,
			senderId: userId,
			message : message,
			timestamp: new Date().toISOString(),
		};

		// Check it user is connected to socket
		const	socket = this._connections.get(toUserId);
		if (socket)
		{
			console.log(`[CHAT] Sending private message from user ${userId} to user ${toUserId}`);
			this.#dispatchEventToSocket(socket, 'chat.private_message', data);
		}
		else
			console.log(`[CHAT] User ${toUserId} not connected, cannot send private message`);
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
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
}

export const	chatConnectionManager = new ChatConnectionManager();
