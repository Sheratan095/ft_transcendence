class	UserConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		this.#sendOnlineUsersList(socket);
		this.#dispatchEventToFriends(userId, 'friendOnline', { userId });
	}

	removeConnection(userId)
	{
		this._connections.delete(userId);
	}

	getConnection(userId)
	{
		return (this._connections.get(userId));
	}

	count()
	{
		return (this._connections.size);
	}

	#sendOnlineUsersList(socket)
	{
		const	onlineUserIds = Array.from(this._connections.keys());
		try
		{
			socket.send(JSON.stringify({ event: 'onlineUsers', data: { users: onlineUserIds } }));
		}
		catch (e)
		{
			console.error('Failed to send online users list:', e.message);
		}
	}

	#dispatchEventToFriends(userId, event, data)
	{
		console.log(`Dispatching event '${event}' from user ${userId} to friends`);
		for (const [otherUserId, otherSocket] of this._connections.entries())
		{
			// Except send to self
			if (otherUserId !== userId)
			{
				try
				{
					otherSocket.send(JSON.stringify({ event, data }));
				}
				catch (e)
				{
					console.error(`Failed to send ${event} to user ${otherUserId}:`, e.message);
				}
			}
		}
	}
}

export const	userConnectionManager = new UserConnectionManager();