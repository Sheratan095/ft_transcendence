import axios from 'axios';

// add notification...url to required env vars
export async function	notifyFriendRequest(requesterUsername, targetUserId)
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

export async function	notifyFriendAccept(requesterId, accepterUsername)
{
	try
	{
		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-friend-accept`,
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				},
				body:
				{
					requesterId: requesterId,
					accepterUsername: accepterUsername,
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