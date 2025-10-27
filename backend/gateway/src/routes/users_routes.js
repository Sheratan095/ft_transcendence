import axios from 'axios'

export const	getUsers = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${process.env.USERS_SERVICE_URL}/`,
		{
			headers:
			{
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
				'x-user-data': JSON.stringify(req.user) // Pass authenticated user data
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	getUser = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	username = req.params.username; // From URL parameter

		const	response = await axios.get(`${process.env.USERS_SERVICE_URL}/user`,
		{
			params: req.query,
			headers:
			{
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
				'x-user-data': JSON.stringify(req.user) // Pass authenticated user data
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	updateUsername = async (req, reply) =>
{
	try
	{
		const	response = await axios.put(`${process.env.USERS_SERVICE_URL}/update-user`,
		req.body,
		{
			headers:
			{
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
				'x-user-data': JSON.stringify(req.user) // Pass authenticated user data
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	uploadAvatar = async (req, reply) =>
{
	try
	{
		const	formData = new FormData();
		formData.append('avatar', req.file);

		const	response = await axios.put(`${process.env.USERS_SERVICE_URL}/update-avatar`, formData,
		{
			headers:
			{
				...formData.getHeaders(),
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
				'x-user-data': JSON.stringify(req.user) // Pass authenticated user data
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}