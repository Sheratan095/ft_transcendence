import axios from 'axios'

const	CHAT_URL = process.env.CHAT_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(req)
{
	return ({
		'x-internal-api-key': API_KEY,
		'x-user-data': JSON.stringify(req.user)
	});
}

export const	getAllChats = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${CHAT_URL}/`, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Chat service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Chat service unavailable' }))
	}
}

export const	getMessages = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${CHAT_URL}/messages`, {
			params: req.query,
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Chat service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Chat service unavailable' }))
	}
}

export const	addUserToChat = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${CHAT_URL}/add-user-to-chat`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Chat service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Chat service unavailable' }))
	}
}