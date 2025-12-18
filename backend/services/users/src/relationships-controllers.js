import { extractUserData } from './users-help.js';

import {
	notifyFriendAccept,
	notifyFriendRequest
} from './relationships-help.js';

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

//-------------------READONLY OPERATIONS-----------------------------

export async function	getUserRelationships(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;

		const	relationships = await usersDb.getRelationships(userId);

		console.log('[RELATIONSHIPS] GetUserRelationships success for userId:', userId);

		return (reply.code(200).send(relationships));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetUserRelationships error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	getUsersRelationship(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userA = extractUserData(req).id;
		const	userB = req.query.userId;

		const	relationship = await usersDb.getUsersRelationship(userA, userB);

		console.log('[RELATIONSHIPS] GetUsersRelationship success between ', userA, ' and ', userB);

		return (reply.code(200).send(relationship));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetUsersRelationship error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	getFriends(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;

		const	friends = await usersDb.getFriends(userId);

		// Map snake_case to camelCase
		const	mappedFriends = friends.map(friend => ({
			userId: friend.userId,
			username: friend.username,
			avatarUrl: friend.avatar_url,
			friendsSince: friend.friends_since
		}));

		console.log('[RELATIONSHIPS] GetFriends success for userId:', userId);

		return (reply.code(200).send(mappedFriends));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetFriends error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	getIncomingRequests(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;

		const	requests = await usersDb.getIncomingRequests(userId);

		console.log('[RELATIONSHIPS] GetIncomingRequests success for userId:', userId);

		return (reply.code(200).send(requests));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetIncomingRequests error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	getOutgoingRequests(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;

		const	requests = await usersDb.getOutgoingRequests(userId);

		console.log('[RELATIONSHIPS] GetOutgoingRequests success for userId:', userId);

		return (reply.code(200).send(requests));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetOutgoingRequests error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-------------------WRITE OPERATIONS-----------------------------

export async function	rejectFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ requesterId } = req.body;

		await usersDb.rejectFriendRequest(userId, requesterId);

		console.log('[RELATIONSHIPS] Friend request rejected by userId:', userId, 'from requesterId:', requesterId);

		return (reply.code(200).send({ message: 'Friend request rejected' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] RejectFriendRequest error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		if (err.message.includes('No pending'))
			return (reply.code(404).send({ error: err.message }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	blockUser(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ blockedId } = req.body.targetId;

		await usersDb.blockUser(userId, blockedId);

		console.log('[RELATIONSHIPS] User blocked by userId:', userId, 'blockedId:', blockedId);

		return (reply.code(200).send({ message: 'User blocked' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] BlockUser error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	unblockUser(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ targetId } = req.body.targetId;

		await usersDb.unblockUser(userId, targetId);

		console.log('[RELATIONSHIPS] User unblocked by userId:', userId, 'targetId:', targetId);

		return (reply.code(200).send({ message: 'User unblocked' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] UnblockUser error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	cancelFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ targetId } = req.body.targetId;

		await usersDb.cancelFriendRequest(userId, targetId);

		console.log('[RELATIONSHIPS] Friend request cancelled by userId:', userId, 'to targetId:', targetId);

		return (reply.code(200).send({ message: 'Friend request cancelled' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] CancelFriendRequest error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		if (err.message.includes('No outgoing'))
			return (reply.code(404).send({ error: err.message }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	removeFriend(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ friendId } = req.body.targetId;

		await usersDb.removeFriend(userId, friendId);

		console.log('[RELATIONSHIPS] Friend removed by userId:', userId, 'friendId:', friendId);

		return (reply.code(200).send({ message: 'Friend removed' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] RemoveFriend error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// This function could be avoided just by calling the db query directly in the deleteUser controller,
// but for consistency and future extensibility (moving relationships in another microservice), we keep it here.
export const	deleteUserRelationships = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = req.body.userId;

		await usersDb.deleteUserRelationships(userId);

		console.log(`[RELATIONSHIPS] User relationships deleted: ${userId}`);

		return (reply.code(200).send({ message: 'User relationships deleted' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] DeleteUserRelationships error: ', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------CONTROLLERS THAT SEND NOTIFICATIONS TO OTHER USERS-----------------------------

export async function	sendFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ targetId } = req.body;

		// Validate targetId exists
		const	targetUser = await usersDb.getUserById(targetId);
		if (!targetUser)
			return (reply.code(404).send({ error: 'User not found' }));

		// Check if users are blocked before sending request
		if (await usersDb.isBlocked(userId, targetId))
		{
			console.log('[RELATIONSHIPS] Not notifying - users are blocked');
			return (reply.code(200).send({ message: 'Friend request accepted' }));
		}

		// Can't send request to yourself
		if (userId === targetId)
			return (reply.code(400).send({ error: 'Cannot send friend request to yourself' }));

		await usersDb.sendFriendRequest(userId, targetId);

		const	requesterUsername = (await usersDb.getUserById(userId)).username;

		if (await notifyFriendRequest(requesterUsername, targetId, userId) === false)
			return (reply.code(500).send({ error: 'Failed to notify user' }));

		console.log('[RELATIONSHIPS] Friend request sent from userId:', userId, 'to targetId:', targetId);

		return (reply.code(200).send({ message: 'Friend request sent' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] SendFriendRequest error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		if (err.message.includes('blocked') || err.message.includes('already') || err.message.includes('already sent'))
			return (reply.code(400).send({ error: err.message }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	acceptFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	user = extractUserData(req); // Accepter
		const	{ requesterId } = req.body;

		// Check if users are blocked before accepting request
		if (await usersDb.isBlocked(user.id, requesterId))
		{
			console.log('[RELATIONSHIPS] Not notifying - users are blocked');
			return (reply.code(200).send({ message: 'Friend request accepted' }));
		}

		await usersDb.acceptFriendRequest(user.id, requesterId);

		const	accepterUsername = (await usersDb.getUserById(user.id)).username;

		if (await notifyFriendAccept(requesterId, user.id, accepterUsername) === false)
			return (reply.code(500).send({ error: 'Failed to notify user' }));

		console.log('[RELATIONSHIPS] Friend request accepted by userId:', user.id, 'from requesterId:', requesterId);

		return (reply.code(200).send({ message: 'Friend request accepted' }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] AcceptFriendRequest error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		if (err.message.includes('No pending'))
			return (reply.code(404).send({ error: err.message }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------INTERNAL ROUTES CALLED-----------------------------
export async function	getFriendsInternal(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = req.query.userId;

		const	friends = await usersDb.getFriends(userId);

		// Map snake_case to camelCase
		const	mappedFriends = friends.map(friend => ({
			userId: friend.userId,
			username: friend.username,
			avatarUrl: friend.avatar_url,
			friendsSince: friend.friends_since
		}));

		console.log('[RELATIONSHIPS] GetFriendsInternal success for userId:', userId);

		return (reply.code(200).send(mappedFriends));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] GetFriendsInternal error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	checkBlock(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userA = req.query.userA;
		const	userB = req.query.userB;

		const	isBlocked = await usersDb.isBlocked(userA, userB);

		console.log('[RELATIONSHIPS] CheckBlock between ', userA, ' and ', userB, ' :', isBlocked);

		return (reply.code(200).send({ isBlocked }));
	}
	catch (err)
	{
		console.log('[RELATIONSHIPS] CheckBlock error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}