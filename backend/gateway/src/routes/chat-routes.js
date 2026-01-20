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
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (get-all-chats) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
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
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (get-messages) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
	}
}

export const	addUserToChat = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${CHAT_URL}/add-user`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (add-user) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
	}
}

export const	createGroupChat = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${CHAT_URL}/create-group-chat`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (create-group-chat) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
	}
}

export const	leaveGroupChat = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${CHAT_URL}/leave-group-chat`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (leave-group-chat) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
	}
}

export const	createPrivateChat = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${CHAT_URL}/start-private-chat`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		// Forward the specific error from chat service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		// Only log and send generic error if chat service did not handle it
		console.log('[GATEWAY] Chat service (start-private-chat) error:', err.message);

		return (reply.code(500).send({ error: 'Chat service unavailable' }));
	}
}