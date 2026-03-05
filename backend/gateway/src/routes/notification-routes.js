import axios from 'axios'

const	NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(request)
{
	const	headers =
	{
		'x-internal-api-key': API_KEY,
	};

	if (request.user)
		headers['x-user-data'] = JSON.stringify(request.user);

	return (headers);
}

export async function	isUserOnline(request, reply)
{
	try
	{
		const { userId } = request.query;
		const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/is-user-online?userId=${userId}`, {
			headers: getAuthHeaders(request),
		});

		return (reply.code(200).send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from notification service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if notification service did not handle it
		console.log('[GATEWAY] Notification service (isUserOnline) error:', err.message);

		return (reply.code(500).send({ error: 'Notification service unavailable' }))
	}
}