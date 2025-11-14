import axios from 'axios';

// add notification...url to required env vars
export async function	notifyFriendRequest(requesterUsername, targetUserId)
{
	try
	{
		await axios.post( `${process.env.NOTIFICATION_SERVICE_URL}/send-friend-request`,
			{
				requesterUsername: requesterUsername,
				targetUserId: targetUserId,
			},
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				},
			}
		)

		return (true);
	}
	catch (error)
	{
		console.log('[USERS] Error notifying friend request:', error.message);

		return (false);
	}
}

export async function	notifyFriendAccept(requesterId, accepterUsername)
{
	try
	{
		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-friend-accept`,
			{
				requesterId: requesterId,
				accepterUsername: accepterUsername,
			},
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		return (true);
	}
	catch (error)
	{
		// If error is 404, user does not exist
		if (error.response && error.response.status === 404)
			console.log('User not found for requesterId:', requesterId);
		else
			console.log('Error notifying friend accept:', error.message);

		return (false);
	}
}