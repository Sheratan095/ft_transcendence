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
				'x-internal-api-key': process.env.INTERNAL_API_KEY
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
				'x-internal-api-key': process.env.INTERNAL_API_KEY
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

export async function logoutRoute(request, reply)
{
	// Redirect logout requests to auth service
	try
	{
		// In Axios, during a DELETE request, the request body must be sent as the 'data' property in the config object
		// unlike POST requests where the body is the second argument
		const	response = await axios.delete(`${process.env.AUTH_SERVICE_URL}/logout`, 
		{
			headers: {
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
			data: request.body
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

export async function	tokenRoute(request, reply)
{
	// Redirect token refresh requests to auth service
	try
	{
		const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/token`, request.body,
		{
			headers: {
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
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

export async function	verifyTwoFactorAuth(request, reply)
{
	// Redirect 2FA verification requests to auth service
	try
	{
		const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/2fa`, request.body,
		{
			headers: {
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
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