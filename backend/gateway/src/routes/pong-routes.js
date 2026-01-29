import axios from 'axios'

const	PONG_SERVICE_URL = process.env.PONG_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(req)
{
	return ({
		'x-internal-api-key': API_KEY,
		'x-user-data': JSON.stringify(req.user)
	});
}

export const	getUserStats = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${PONG_SERVICE_URL}/stats`, {
			params: req.query,
			headers: getAuthHeaders(req),
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from pong service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if pong service did not handle it
		console.log('[GATEWAY] Pong service (get-user-stats) error:', err.message)

		return (reply.code(500).send({ error: 'Pong service unavailable' }))
	}
}

export const	getUserMatchHistory = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${PONG_SERVICE_URL}/history`, {
			params: req.query,
			headers: getAuthHeaders(req),
		})
		
		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from pong service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if pong service did not handle it
		console.log('[GATEWAY] Pong service (get-user-match-history) error:', err.message)

		return (reply.code(500).send({ error: 'Pong service unavailable' }))
	}
}

export const	getAllTournaments = async (req, reply) =>
{
	// Forward request to pong service with user data
	try
	{
		const	response = await axios.get(`${PONG_SERVICE_URL}/get-all-tournaments`, {
			headers: getAuthHeaders(req),
		})
		
		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from pong service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if pong service did not handle it
		console.log('[GATEWAY] Pong service (get-all-tournaments) error:', err.message)

		return (reply.code(500).send({ error: 'Pong service unavailable' }))
	}
}

export const	createTournament = async (req, reply) =>
{
	// Forward request to pong service with user data
	try
	{
		const	response = await axios.post(`${PONG_SERVICE_URL}/create-tournament`, req.body, {
			headers: getAuthHeaders(req),
		})
		
		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from pong service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if pong service did not handle it
		console.log('[GATEWAY] Pong service (create-tournament) error:', err.message)

		return (reply.code(500).send({ error: 'Pong service unavailable' }))
	}
}
