import Fastify from 'fastify'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Validate required environment variables
import { checkEnvVariables } from './gateway_help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'AUTH_SERVICE_URL', 'PORT']);

import {authenticateToken } from './gateway_help.js';


import {
	loginRoute,
	registerRoute,
	logoutRoute
} from './routes/auth_routes.js'

import {
	getUsers
} from './routes/users_routes.js'


// Initialize Fastify instance with built-in logging
const	fastify = Fastify({ logger: false })

// AUTH routes
fastify.post('/auth/login', loginRoute)
fastify.post('/auth/register', registerRoute)
fastify.delete('/auth/logout', logoutRoute)

// USERS routes PROTECTED => require valid token
fastify.get('/users/', { preHandler: authenticateToken }, getUsers)

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