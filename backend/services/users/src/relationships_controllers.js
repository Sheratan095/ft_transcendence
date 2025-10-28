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