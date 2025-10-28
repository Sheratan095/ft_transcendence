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

export async function	acceptFriendRequest(req, reply)
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = extractUserData(req).id;
		const	{ relationshipId } = req.body.relationshipId;

		await usersDb.updateRelationshipStatus(relationshipId, userId, 'accepted');

		return (reply.code(200).send({ message: 'Friend request accepted' }));
	}
	catch (err)
	{
		console.log('AcceptFriendRequest error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}

}