import axios from 'axios'

const	USERS_URL = process.env.USERS_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(req)
{
	return ({
		'x-internal-api-key': API_KEY,
		'x-user-data': JSON.stringify(req.user)
	});
}

export const	getUserRelationships = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships`, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (get-user-relationships) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	getFriends = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships/friends`, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (get-user-friends) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	getIncomingRequests = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships/requests/incoming`, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (get-user-incoming-requests) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	getOutgoingRequests = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships/requests/outgoing`, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (get-user-outgoing-requests) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
}

export const	sendFriendRequest = async (req, reply) =>
{
	try
	{
		const	response = await axios.post(`${USERS_URL}/relationships/request`, req.body, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (send-friend-request) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	acceptFriendRequest = async (req, reply) =>
{
	try
	{
		const	response = await axios.put(`${USERS_URL}/relationships/accept`, req.body, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (accept-friend-request) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	rejectFriendRequest = async (req, reply) =>
{
	try
	{
		const	response = await axios.put(`${USERS_URL}/relationships/reject`, req.body, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (reject-friend-request) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	blockUser = async (req, reply) =>
{
	try
	{
		const	response = await axios.put(`${USERS_URL}/relationships/block`, req.body, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (block-user) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	unblockUser = async (req, reply) =>
{
	try
	{
		const	response = await axios.delete(`${USERS_URL}/relationships/unblock`, {
			data: req.body,
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (unblock-user) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	cancelFriendRequest = async (req, reply) =>
{
	try
	{
		const	response = await axios.delete(`${USERS_URL}/relationships/cancelFriendRequest`, {
			data: req.body,
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (cancel-friend-request) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	removeFriend = async (req, reply) =>
{
	try
	{
		const	response = await axios.delete(`${USERS_URL}/relationships/removeFriend`, {
			data: req.body,
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (remove-friend) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
};

export const	getUsersRelationship = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships/getUsersRelationship`, {
			params: req.query,
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		// Forward the specific error from relationships service, do not log
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		// Only log and send generic error if relationships service did not handle it
		console.log('[GATEWAY] Relationships service (get-user-relationship) error:', err.message)

		return (reply.code(500).send({ error: 'Relationships service unavailable' }))
	}
}