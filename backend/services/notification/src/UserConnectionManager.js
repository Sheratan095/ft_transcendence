
// Dot-notation (most common & scalable)
// domain.action
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
		this.#dispatchEventToFriends(userId, 'friend.online', { userId });
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
				'friend.request',
				{ from: requesterUsername }
			);
		}
	}

	sendFriendRequestAccept(requesterId, accepterUsername)
	{
		const	targetSocket = this.getConnection(requesterId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'friend.accept',
				{ from: accepterUsername }
			);
		}
	}

	#sendOnlineUsersList(socket)
	{
		// TO DO: exclude self
		// Send list of online user IDs excluding the current socket's user
		const	onlineUserIds = Array.from(this._connections.keys());

		for (const userId of onlineUserIds)
		{
			if (userId !== socket.userId)
			{
				this.#dispatchEventToSocket(
					socket,
					'friend.online',
					{ userId }
				);
			}
		}
	}

	#dispatchEventToFriends(userId, event, data)
	{
		console.log(`[NOTIFICATION] Dispatching event '${event}' from user ${userId} to friends`);

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
				console.error(`[NOTIFICATION] Failed to send ${event} to user ${userId}:`, e.message);
			}
		}
	}
}

export const	userConnectionManager = new UserConnectionManager();