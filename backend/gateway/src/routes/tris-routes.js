import axios from 'axios'

const	TRIS_SERVICE_URL = process.env.TRIS_SERVICE_URL;
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

export async function	getUserStatsRoute(request, reply)
{
	try
	{
		const	response = await axios.get(`${TRIS_SERVICE_URL}/stats`, {
			headers: getAuthHeaders(request),
			params: request.query
		});

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from tris service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if tris service did not handle it
		console.log('[GATEWAY] Tris service (get-user-stats) error:', err.message)

		return (reply.code(500).send({ error: 'Tris service unavailable' }))
	}
}

export async function	getUserMatchHistoryRoute(request, reply)
{
	try
	{
		const	response = await axios.get(`${TRIS_SERVICE_URL}/history`, {
			headers: getAuthHeaders(request),
			params: request.query
		});

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from tris service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if tris service did not handle it
		console.log('[GATEWAY] Tris service (get-user-match-history) error:', err.message)

		return (reply.code(500).send({ error: 'Tris service unavailable' }))
	}
}