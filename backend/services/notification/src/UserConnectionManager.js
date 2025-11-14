
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
		// First: send the list of currently-online users to the newly connected user
		this.#sendOnlineUsersListTo(userId, socket);

		// Then notify other connected users that this user is now online
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

	sendFriendRequestNotification(targetUserId, requesterUsername, requesterId)
	{
		const	targetSocket = this.getConnection(targetUserId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'friend.request',
				{ from: requesterUsername, requesterId: requesterId }
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

	// Send the current list of connected users to the newly connected `senderUserId`.
	// The client expects a single event containing the list of online friends.
	#sendOnlineUsersListTo(senderUserId, senderSocket)
	{
		const	online = [];

		for (const [otherUserId] of this._connections.entries())
		{
			if (otherUserId !== senderUserId)
				online.push(otherUserId);
		}

		this.#dispatchEventToSocket(senderSocket, 'friends.onlineList', { online });
	}

	#dispatchEventToFriends(senderUserId, event, data)
	{
		console.log(`[NOTIFICATION] Dispatching event '${event}' from user ${senderUserId} to friends`);

		for (const [otherUserId, otherSocket] of this._connections.entries())
		{
			// Except send to self
			if (otherUserId !== senderUserId)
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
				console.error(`[NOTIFICATION] Failed to send ${event}:`, e.message);
			}
		}
	}
}

export const	userConnectionManager = new UserConnectionManager();