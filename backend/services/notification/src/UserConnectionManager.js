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

	sendFriendRequestNotification(targetUserId, requesterUsername)
	{
		const	targetSocket = this.getConnection(targetUserId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'friendRequest',
				{ from: requesterUsername }
			);
		}
	}

	sendFriendRequestAccept(requesterId, accepterUsername, relationshipId)
	{
		const	targetSocket = this.getConnection(requesterId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'friendAccept',
				{ from: accepterUsername }
			);
		}
	}

	#sendOnlineUsersList(socket)
	{
		// TO DO: exclude self
		// Send list of online user IDs excluding the current socket's user
		const	onlineUserIds = Array.from(this._connections.keys());

		this.#dispatchEventToSocket(socket, 'onlineUsers', { users: onlineUserIds });
	}

	#dispatchEventToFriends(userId, event, data)
	{
		console.log(`Dispatching event '${event}' from user ${userId} to friends`);
		for (const [otherUserId, otherSocket] of this._connections.entries())
		{
			// Except send to self
			if (otherUserId !== userId)
				this.#dispatchEventToSocket(otherSocket, event, data);
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
				console.error(`Failed to send ${event} to user ${userId}:`, e.message);
			}
		}
	}
}

export const	userConnectionManager = new UserConnectionManager();