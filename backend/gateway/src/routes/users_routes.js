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

		const	response = await axios.get(`${process.env.USERS_SERVICE_URL}/users/${username}`,
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