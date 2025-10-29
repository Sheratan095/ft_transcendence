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
		console.log('UserRelationships error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('GetFriends error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
	}
};

export const	getIncomingRequests = async (req, reply) =>
{
	try
	{
		const	response = await axios.get(`${USERS_URL}/relationships/requests`, {
			headers: getAuthHeaders(req)
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		console.log('GetIncomingRequests error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
	}
};

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
		console.log('SendFriendRequest error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('AcceptFriendRequest error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('RejectFriendRequest error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('BlockUser error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('UnblockUser error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('CancelFriendRequest error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
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
		console.log('RemoveFriend error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
	}
};
