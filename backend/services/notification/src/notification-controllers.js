// The class is initialized in UserConnectionManager.js
import { notificationConnectionManager } from './NotificationConnectionManager.js';
import { sendOTPEmail } from './notification-help.js'

export const	sendFriendRequest = async (req, reply) =>
{
	try
	{
		const	{ requesterUsername, targetUserId, requesterId } = req.body;
		notificationConnectionManager.sendFriendRequestNotification(targetUserId, requesterUsername, requesterId);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendFriendRequest handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

// export const	sendFriendAccept = async (req, reply) =>
// {
// 	try
// 	{
// 		const	{ requesterId, accepterUsername, accepterId } = req.body;

// 		notificationConnectionManager.sendFriendRequestAccept(requesterId, accepterUsername, accepterId);

// 		return (reply.code(200).send());
// 	}
// 	catch (err)
// 	{
// 		console.error('[NOTIFICATION] Error in sendFriendAccept handler:', err);
// 		return (reply.code(500).send({error: 'Internal server error' }));
// 	}
// }

export const	send2FaCode = async (req, reply) =>
{
	try
	{
		const	{ email, otpCode, language, expiryMinutes } = req.body;

		await sendOTPEmail(email, otpCode, language, expiryMinutes);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in send2FaCode handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	getActiveUsersCount = async (req, reply) =>
{
	try
	{
		const	activeConnections = notificationConnectionManager.count();

		return reply.code(200).send({ activeConnections });
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in getActiveUsersCount handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	sendChatUserAdded = async (req, reply) =>
{
	try
	{
		const	{ from, senderId, targetId, chatId } = req.body;

		notificationConnectionManager.sendChatUserAddedNotification(targetId, senderId, from, chatId);

		console.log(`[NOTIFICATION] Notifying user ${targetId} about being added to chat ${chatId} by ${senderId}`);
	
		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendChatUserAdded handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	sendNowFriends = async (req, reply) =>
{
	try
	{
		const	{ user1Id, user2Id, user1Username, user2Username } = req.body;

		// Notify both users that they are now friends
													// TO USER ID, OTHER USER ID, OTHER USERNAME
		notificationConnectionManager.sendNowFriendsNotification(user1Id, user2Id, user2Username);
		notificationConnectionManager.sendNowFriendsNotification(user2Id, user1Id, user1Username);

		console.log(`[NOTIFICATION] Notifying user ${user1Id} and ${user2Id} that they are now friends`);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendNowFriends handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	removeWsConnection = async (req, reply) =>
{
	try
	{
		const { userId } = req.body;

		notificationConnectionManager.removeConnection(userId);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in removeWsConnection handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

//-----------------------------GAME NOTIFICATIONS-----------------------------

export const	sendGameInvite = async (req, reply) =>
{
	try
	{
		const	{ senderId, senderUsername, targetId, gameId, gameType } = req.body;

		notificationConnectionManager.sendGameInviteNotification(targetId, senderId, senderUsername, gameId, gameType);
		console.log(`[NOTIFICATION] Notifying user ${targetId} about ${gameType} game invite from ${senderUsername} (game ID: ${gameId})`);
	
		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendPongGameInvite handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}
