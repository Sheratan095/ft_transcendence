import axios from 'axios'

// Login route handler
export async function loginRoute(request, reply)
{
	// Redirect login requests to auth service
	try
	{
		const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/login`, request.body,
		{
			headers: {
				'x-api-key': process.env.INTERNAL_API_KEY
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

// Register route handler
export async function registerRoute(request, reply)
{
	// Redirect registration requests to auth service
	try
	{
		const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/register`, request.body,
		{
			headers: {
				'x-api-key': process.env.INTERNAL_API_KEY
			}
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}
