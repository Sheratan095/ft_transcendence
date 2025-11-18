
// Chat connection manager handles WebSocket connections and message routing
class	ChatConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
		this._rooms = new Map(); // roomId -> Set of userIds
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		console.log(`[CHAT] User ${userId} connected`);
	}

	removeConnection(userId)
	{
		// Remove user from all rooms
		for (const [roomId, users] of this._rooms.entries())
		{
			users.delete(userId);
			if (users.size === 0)
				this._rooms.delete(roomId);
		}

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

	// Join a chat room (1-on-1 or group chat)
	joinRoom(userId, roomId)
	{
		if (!this._rooms.has(roomId))
			this._rooms.set(roomId, new Set());
		
		this._rooms.get(roomId).add(userId);
		console.log(`[CHAT] User ${userId} joined room ${roomId}`);
	}

	// Leave a chat room
	leaveRoom(userId, roomId)
	{
		const	room = this._rooms.get(roomId);
		
		if (room)
		{
			room.delete(userId);
			if (room.size === 0)
				this._rooms.delete(roomId);
			
			console.log(`[CHAT] User ${userId} left room ${roomId}`);
		}
	}

	// Send message to a specific room
	sendToRoom(roomId, event, data, excludeUserId = null)
	{
		const	room = this._rooms.get(roomId);
		
		if (!room)
		{
			console.log(`[CHAT] Room ${roomId} not found`);
			return;
		}

		console.log(`[CHAT] Sending event '${event}' to room ${roomId}`);

		for (const userId of room)
		{
			if (userId !== excludeUserId)
			{
				const	socket = this.getConnection(userId);
				if (socket)
					this.#dispatchEventToSocket(socket, event, data);
			}
		}
	}

	// Send message to a specific user
	sendToUser(userId, event, data)
	{
		const	socket = this.getConnection(userId);
		
		if (socket)
		{
			this.#dispatchEventToSocket(socket, event, data);
			console.log(`[CHAT] Sent event '${event}' to user ${userId}`);
		}
		else
			console.log(`[CHAT] User ${userId} not connected`);
	}

	// Send typing indicator to room
	sendTypingIndicator(roomId, userId, username, isTyping)
	{
		this.sendToRoom(
			roomId,
			'chat.typing',
			{ userId, username, isTyping },
			userId // exclude sender
		);
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
}

export const	chatConnectionManager = new ChatConnectionManager();
