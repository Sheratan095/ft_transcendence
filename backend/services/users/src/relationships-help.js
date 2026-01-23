import axios from 'axios';

// add notification...url to required env vars
export async function	notifyFriendRequest(requesterUsername, targetUserId, requesterId)
{
	try
	{
		await axios.post( `${process.env.NOTIFICATION_SERVICE_URL}/send-friend-request`,
			{
				targetUserId: targetUserId,
				requesterId: requesterId,
				requesterUsername: requesterUsername,
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
		console.log('[RELATIONSHIPS] Error notifying friend request:', error.message);

		return (false);
	}
}

export async function	notifyFriendAccept(requesterId, accepterId, accepterUsername)
{
	try
	{
		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-friend-accept`,
			{
				requesterId: requesterId,
				accepterId: accepterId,
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
			console.log('[RELATIONSHIPS] User not found for requesterId:', requesterId);
		else
			console.log('[RELATIONSHIPS] Error notifying friend accept:', error.message);

		return (false);
	}
}

export async function	notifyNowFriends(user1Id, user2Id, user1Username, user2Username)
{
	try
	{
		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-now-friends`,
			{
				user1Id: user1Id,
				user2Id: user2Id,
				user1Username: user1Username,
				user2Username: user2Username,
			},
			{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		)

		return (true);
	}
	catch (error)
	{
		// If error is 404, user does not exist
		if (error.response && error.response.status === 404)
			console.log('[RELATIONSHIPS] User not found for userId:', userId);
		else
			console.log('[RELATIONSHIPS] Error notifying now friends:', error.message);

		return (false);
	}
}