import { authenticateToken } from './gateway_help.js'
import Fastify from 'fastify'
import axios from 'axios'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Initialize Fastify instance with built-in logging
const fastify = Fastify({ logger: false })

//prehandler to authenticate requests: authenticateToken

// This doesn't need to authenticate the token beacause, before login the user doesn't have a token
fastify.post('/auth/login', async (request, reply) =>
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
})

fastify.post('/auth/register', async (request, reply) =>
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
})



// Server startup function with error handling
const	start = async () =>
{
	try
	{
		fastify.listen({ port: process.env.PORT })
		console.log(`Gateway server is running on port ${process.env.PORT}`)
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