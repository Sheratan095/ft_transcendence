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
		console.log('[GATEWAY] GetUserStats error:', err.message)
		if (err.response)
			console.log('[GATEWAY] GetUserStats response data:', err.response.data)

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
		console.log('[GATEWAY] GetUserMatchHistory error:', err.message)
		if (err.response)
			console.log('[GATEWAY] GetUserMatchHistory response data:', err.response.data)

		return (reply.code(500).send({ error: 'Tris service unavailable' }))
	}
}