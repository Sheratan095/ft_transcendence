import axios from 'axios';

// TO DO implement
// add notification...url to required env vars
export async function	notifyFriendRequest(requesterUsername, targetUserId, relationshipId)
{
	try
	{
		const	response = await axios.get(`${process.env.NOTIFICATION_SERVICE_URL}/get-account?id=${userId}`,
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		return (response.data.user);

	}
	catch (error)
	{
		// If error is 404, user does not exist
		if (error.response && error.response.status === 404)
			console.log('User not found in auth service for userId:', userId);
		else
			console.log('Error fetching account from auth service:', error.message);

		return (null);
	}

}