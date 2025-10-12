// Load environment variables
require('dotenv').config()

// Initialize Fastify instance with built-in logging
const fastify = require('fastify')({ logger: false })
// HTTP client for making requests to other services
const axios = require('axios')

const	AUTH_SERVICE_URL = 'http://localhost:4000'

const posts = [
	{
		username: 'Kyle',
		title: 'Post 1'
	},
	{
		username: 'Jim',
		title: 'Post 2'
	}
]

// Protected route to get posts for authenticated user
// Uses authenticateToken as preHandler to validate JWT before processing request
fastify.get('/posts', { preHandler: authenticateToken }, async (request, reply) =>
{
	// Filter posts to only return posts belonging to the authenticated user
	const	userPosts = posts.filter(post => post.username === request.user.name)

	return (reply.send(userPosts))
})

// This doesn't need to authenticate the token beacause, before login the user doesn't have a token
fastify.post('/auth/login', async (request, reply) =>
{
	// Redirect login requests to auth service
	try
	{
		const	response = await axios.post(`${AUTH_SERVICE_URL}/login`, request.body,
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
})

fastify.post('/auth/register', async (request, reply) =>
{
	console.log('Api key in register before: ', process.env.INTERNAL_API_KEY)

	// Redirect registration requests to auth service
	try
	{
		const	response = await axios.post(`${AUTH_SERVICE_URL}/register`, request.body,
		{
			headers: {
				'x-api-key': process.env.INTERNAL_API_KEY
			}
		})
		console.log('Api key in register: ', process.env.INTERNAL_API_KEY)

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('Auth service error:', err.message)
		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
})

// Authentication middleware that validates JWT tokens via auth service
// This function is called before protected routes to verify user authentication
async function	authenticateToken(request, reply)
{
	// Extract Authorization header and parse Bearer token
	const	authHeader = request.headers['authorization']
	const	token = authHeader && authHeader.split(' ')[1]
	
	// Return 401 if no token provided
	if (token == null)
		return (reply.code(401).send({ error: 'Authorization header required' }))

	try
	{
		// Call auth service to validate the token with API key
		const	response = await axios.post(`${AUTH_SERVICE_URL}/validate-token`, 
			{token: token},
			{
				headers: {
					'x-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		// If token is valid, attach user data to request object
		if (response.data.valid)
			request.user = response.data.user
		else
			return (reply.code(403).send({ error: 'Invalid token' }))

	}
	catch (err)
	{
		// Log authentication errors for debugging
		console.log('Auth service error:', err.message)

		// Handle specific auth service responses
		if (err.response && err.response.status === 403)
			return (reply.code(403).send({ error: 'Invalid token' }))

		// Handle auth service unavailability or network errors
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

// Server startup function with error handling
const	start = async () =>
{
	try
	{
		// Start server on port 3000, listening on all interfaces
		await fastify.listen({ port: 3000})
		console.log('Gateway server is running on port 3000')

	}
	catch (err)
	{
		// Log startup errors and exit process
		fastify.log.error(err)
		process.exit(1)
	}
}
// Initialize the server
start()