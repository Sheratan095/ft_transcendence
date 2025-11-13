import { extractUserData } from './users-help.js';

import {
	notifyFriendAccept,
	notifyFriendRequest
} from './relationships-help.js';

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

export async function	getUserRelationships(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;

		const	relationships = await usersDb.getRelationships(userId);

		return (reply.code(200).send(relationships));
	}
	catch (err)
	{
		console.log('GetUserRelationships error: ', err.message);

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

		// Map updatedAt to friendsSince
		const	mappedFriends = friends.map(friend => ({
			...friend,
			friendsSince: friend.updatedAt
		}));

		return (reply.code(200).send(mappedFriends));
	}
	catch (err)
	{
		console.log('GetFriends error: ', err.message);

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

		return (reply.code(200).send(requests));
	}
	catch (err)
	{
		console.log('GetIncomingRequests error: ', err.message);

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

		return (reply.code(200).send(requests));
	}
	catch (err)
	{
		console.log('GetOutgoingRequests error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	sendFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ targetId } = req.body.targetId;

		// Validate targetId exists
		const	targetUser = await usersDb.getUserById(targetId);
		if (!targetUser)
			return (reply.code(404).send({ error: 'User not found' }));

		// Can't send request to yourself
		if (userId === targetId)
			return (reply.code(400).send({ error: 'Cannot send friend request to yourself' }));

		await usersDb.sendFriendRequest(userId, targetId);

		if (await notifyFriendRequest(extractUserData(req).username, targetId, null) === false)
			return (reply.code(500).send({ error: 'Failed to notify user' }));

		return (reply.code(200).send({ message: 'Friend request sent' }));
	}
	catch (err)
	{
		console.log('SendFriendRequest error: ', err.message);

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
		const	user = extractUserData(req);
		const	{ requesterId } = req.body.requesterId;

		await usersDb.acceptFriendRequest(user.id, requesterId);

		if (await notifyFriendAccept(requesterId, user.username) === false)
			return (reply.code(500).send({ error: 'Failed to notify user' }));

		return (reply.code(200).send({ message: 'Friend request accepted' }));
	}
	catch (err)
	{
		console.log('AcceptFriendRequest error: ', err.message);

		if (err.message && err.message.includes('SQLITE_CONSTRAINT'))
			return reply.code(400).send({ error: 'SQL constraint error', details: err.message });

		if (err.message.includes('No pending'))
			return (reply.code(404).send({ error: err.message }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	rejectFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ requesterId } = req.body.requesterId;

		await usersDb.rejectFriendRequest(userId, requesterId);

		return (reply.code(200).send({ message: 'Friend request rejected' }));
	}
	catch (err)
	{
		console.log('RejectFriendRequest error: ', err.message);

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

		return (reply.code(200).send({ message: 'User blocked' }));
	}
	catch (err)
	{
		console.log('BlockUser error: ', err.message);

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

		return (reply.code(200).send({ message: 'User unblocked' }));
	}
	catch (err)
	{
		console.log('UnblockUser error: ', err.message);

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

		return (reply.code(200).send({ message: 'Friend request cancelled' }));
	}
	catch (err)
	{
		console.log('CancelFriendRequest error: ', err.message);

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

		return (reply.code(200).send({ message: 'Friend removed' }));
	}
	catch (err)
	{
		console.log('RemoveFriend error: ', err.message);

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

		console.log(`User relationships deleted: ${userId}`);

		return (reply.code(200).send({ message: 'User relationships deleted' }));
	}
	catch (err)
	{
		console.log('DeleteUserRelationships error: ', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}