import axios from 'axios'

export const	getUsers = async (req, reply) =>
{
	// Redirect login requests to auth service
	try
	{
		const	response = await axios.get(`${process.env.USERS_SERVICE_URL}/`,
		{
			headers: {
				'x-internal-api-key': process.env.INTERNAL_API_KEY
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