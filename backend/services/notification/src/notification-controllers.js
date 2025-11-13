// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

export const	sendFriendRequest = async (req, reply) =>
{
	try
	{
		const	{ requesterUsername, targetUserId, relationshipId } = req.body;
		userConnectionManager.sendFriendRequestNotification(targetUserId, requesterUsername, relationshipId);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('Error in sendFriendRequest handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}