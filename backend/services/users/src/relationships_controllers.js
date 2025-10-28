import { extractUserData } from './users_help.js';

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
		console.log('GetUserRelationships error:', err.message);
		
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

		return (reply.code(200).send(friends));
	}
	catch (err)
	{
		console.log('GetFriends error:', err.message);
		
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
		console.log('GetIncomingRequests error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	sendFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ friendId } = req.body;

		// Validate friendId exists
		const	friend = await usersDb.getUserById(friendId);
		if (!friend)
			return (reply.code(404).send({ error: 'User not found' }));

		// Can't send request to yourself
		if (userId === friendId)
			return (reply.code(400).send({ error: 'Cannot send friend request to yourself' }));

		await usersDb.sendFriendRequest(userId, friendId);

		return (reply.code(200).send({ message: 'Friend request sent' }));
	}
	catch (err)
	{
		console.log('SendFriendRequest error:', err.message);
		
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
		const	userId = extractUserData(req).id;
		const	{ friendId } = req.body;

		await usersDb.acceptFriendRequest(userId, friendId);

		return (reply.code(200).send({ message: 'Friend request accepted' }));
	}
	catch (err)
	{
		console.log('AcceptFriendRequest error:', err.message);
		
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
		const	{ friendId } = req.body;

		await usersDb.rejectFriendRequest(userId, friendId);

		return (reply.code(200).send({ message: 'Friend request rejected' }));
	}
	catch (err)
	{
		console.log('RejectFriendRequest error:', err.message);
		
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
		const	{ blockedId } = req.body;

		// Can't block yourself
		if (userId === blockedId)
			return (reply.code(400).send({ error: 'Cannot block yourself' }));

		await usersDb.blockUser(userId, blockedId);

		return (reply.code(200).send({ message: 'User blocked' }));
	}
	catch (err)
	{
		console.log('BlockUser error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	unblockUser(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ blockedId } = req.body;

		await usersDb.unblockUser(userId, blockedId);

		return (reply.code(200).send({ message: 'User unblocked' }));
	}
	catch (err)
	{
		console.log('UnblockUser error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export async function	removeFriend(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ friendId } = req.body;

		await usersDb.removeFriend(userId, friendId);

		return (reply.code(200).send({ message: 'Friend removed' }));
	}
	catch (err)
	{
		console.log('RemoveFriend error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}