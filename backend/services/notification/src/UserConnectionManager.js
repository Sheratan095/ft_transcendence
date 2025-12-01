import { getFriendsList } from './notification-help.js';

// Dot-notation (most common & scalable)
// domain.action
class	UserConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	async	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		const	onlineFriends = await getFriendsList(userId, [...this._connections.keys()]);

		// Send the current list of connected users to the newly connected `senderUserId`.
		this.#dispatchEventToSocket(socket, 'friends.onlineList', { onlineFriends });

		// Then notify other connected users that this user is now online
		this.#dispatchEventToFriends(userId, 'friend.online', { userId }, onlineFriends);
	}

	async	removeConnection(userId)
	{
		this._connections.delete(userId);
		const	onlineFriends = await getFriendsList(userId, [...this._connections.keys()]);

		// Notify other connected users that this user is now offline
		this.#dispatchEventToFriends(userId, 'friend.offline', { userId }, onlineFriends);
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

	sendFriendRequestAccept(requesterId, accepterUsername, accepterId)
	{
		const	targetSocket = this.getConnection(requesterId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'friend.accept',
				{
					from: accepterUsername,
					accepterId: accepterId
				}
			);
		}
	}

	sendChatUserAddedNotification(targetId, senderId, fromUsername, chatId)
	{
		const	targetSocket = this.getConnection(targetId);
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'chat.userAdded',
				{
					from: fromUsername,
					senderId: senderId,
					chatId: chatId
				}
			);
		}
	}

	#dispatchEventToFriends(senderUserId, event, data, onlineFriends)
	{
		for (const frined of onlineFriends)
		{
			// Except send to self
			if (frined.userId !== senderUserId)
				this.#dispatchEventToSocket(this.getConnection(frined.userId), event, data);
		}

		console.log(`[NOTIFICATION] Dispatching event '${event}' from user ${senderUserId} to friends`);
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