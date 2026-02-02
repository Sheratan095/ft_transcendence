import { extractUserData } from './users-help.js';

import {
	notifyFriendAccept,
	notifyFriendRequest,
	notifyNowFriends
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

		console.log(`[RELATIONSHIPS] GetUsersRelationship between ${userA} and ${userB} : ${relationship? relationship.relationship_status : 'none'}`);

		// Return empty object if no relationship exists
		if (!relationship)
			return (reply.code(200).send({}));

		// Map snake_case to camelCase to match the response schema
		const	mappedRelationship = {
			requesterId: relationship.requester_id,
			targetId: relationship.target_id,
			relationshipStatus: relationship.relationship_status,
			createdAt: relationship.created_at,
			updatedAt: relationship.updated_at
		};

		return (reply.code(200).send(mappedRelationship));
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
		const	{ targetId } = req.body;

		if (userId === targetId)
			return (reply.code(400).send({ error: 'Cannot block yourself' }));

		await usersDb.blockUser(userId, targetId);

		console.log('[RELATIONSHIPS] User blocked by userId:', userId, 'blockedId:', targetId);

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
		const	{ targetId } = req.body;

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
		const	{ targetId } = req.body;

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
		const	{ targetId } = req.body;

		await usersDb.removeFriend(userId, targetId);

		console.log('[RELATIONSHIPS] Friend removed by userId:', userId, 'friendId:', targetId);

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

		// Can't send request to yourself
		if (userId === targetId)
			return (reply.code(400).send({ error: 'Cannot send friend request to yourself' }));

		const	relationship = await usersDb.getUsersRelationship(userId, targetId);
		if (relationship)
		{
			// Check if blocked - silently return success to avoid revealing block status
			if (relationship.relationship_status === 'blocked')
			{
				// if the requestor is the one who blocked, tell them to unblock first
				if (relationship.requester_id === userId)
				{
					console.log(`[RELATIONSHIPS] User ${userId} tried to send request to ${targetId} but they have blocked them`);
					return (reply.code(400).send({ error: 'You have blocked this user. Unblock them to send a friend request.' }));
				}
				else
				{
					console.log(`[RELATIONSHIPS] User ${userId} tried to send request to ${targetId} but the relationship is blocked`);
					return (reply.code(200).send({ message: 'Friend request sent' }));
				}
			}

			// Already friends
			if (relationship.relationship_status === 'accepted')
			{
				console.log(`[RELATIONSHIPS] User ${userId} tried to send request to ${targetId} but they are already friends`);
				return (reply.code(200).send({ message: 'Already friends' }));
			}
		}

		// Send the friend request - DB handles all cases (new, rejected, mutual)
		const	result = await usersDb.sendFriendRequest(userId, targetId);

		// If the DB auto-accepted a mutual request
		if (result === 'mutual_accept')
		{
			const	targetUsername = targetUser.username;
			const	requesterUsername = (await usersDb.getUserById(userId)).username;

			await notifyNowFriends(userId, targetId, requesterUsername, targetUsername);

			console.log('[RELATIONSHIPS] Auto-accepted mutual friend request between:', userId, 'and', targetId);
			return (reply.code(200).send({ message: 'Now friends' }));
		}

		// Normal friend request sent
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
		const	requesterUser = await usersDb.getUserById(requesterId);

		await notifyFriendAccept(requesterId, user.id, requesterUser.username, accepterUsername);

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