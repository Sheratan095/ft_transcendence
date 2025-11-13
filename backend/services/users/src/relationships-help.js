import axios from 'axios';

// add notification...url to required env vars
export async function	notifyFriendRequest(requesterUsername, targetUserId, relationshipId)
{
	try
	{
		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-friend-request`,
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				},
				body:
				{
					requesterUsername: requesterUsername,
					targetUserId: targetUserId,
					relationshipId: relationshipId
				}
			}
		)

		return (true);
	}
	catch (error)
	{
		// If error is 404, user does not exist
		if (error.response && error.response.status === 404)
			console.log('User not found in auth service for userId:', userId);
		else
			console.log('Error fetching account from auth service:', error.message);

		return (false);
	}
}