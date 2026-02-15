import { getFriendsList, getUsernameById } from './notification-help.js';

class	NotificationConnectionManager
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

		const	username = await getUsernameById(userId);
		// Then notify other connected users that this user is now online
		if (onlineFriends.length > 0)
			this.#dispatchEventToFriends(userId, 'friend.online', { userId, username }, onlineFriends);
	}

	async	removeConnection(userId)
	{
		this._connections.delete(userId);
		const	onlineFriends = await getFriendsList(userId, [...this._connections.keys()]);

		const	username = await getUsernameById(userId);
		// Notify other connected users that this user is now offline
		if (onlineFriends.length > 0)
			this.#dispatchEventToFriends(userId, 'friend.offline', { userId, username }, onlineFriends);
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

	sendNowFriendsNotification(toUserId, userId, username)
	{
		const	targetSocket = this.getConnection(toUserId);

		const	data = {
			userId: userId,
			username: username
		};

		if (targetSocket)
			this.#dispatchEventToSocket( targetSocket, 'friend.nowFriends', data );
	}

	sendGameInviteNotification(targetId, senderId, fromUsername, gameId, gameType)
	{
		const	targetSocket = this.getConnection(targetId);
	
		if (targetSocket)
		{
			this.#dispatchEventToSocket(
				targetSocket,
				'game.invite',
				{
					gameType: gameType,
					from: fromUsername,
					senderId: senderId,
					gameId : gameId
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

export const	notificationConnectionManager = new NotificationConnectionManager();