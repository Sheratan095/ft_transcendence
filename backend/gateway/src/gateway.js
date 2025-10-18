import Fastify from 'fastify'
// Initialize Fastify instance with built-in logging
const	fastify = Fastify({ logger: false })

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Register aggregated documentation from all microservices
import SwaggerAggregator from './swagger_aggregator.js';
const	swaggerAggregator = new SwaggerAggregator();
await swaggerAggregator.register(fastify);// TO DO remove register call, add fastify in construct params of aggregator

// Validate required environment variables
import { checkEnvVariables } from './gateway_help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'AUTH_SERVICE_URL', 'USERS_SERVICE_URL', 'PORT']);

import {authenticateToken } from './gateway_help.js';


import {
	loginRoute,
	registerRoute,
	logoutRoute
} from './routes/auth_routes.js'

import {
	getUsers
} from './routes/users_routes.js'


// AUTH routes - exclude from swagger docs since they're just proxies
fastify.post('/auth/login', { schema: { hide: true }, handler: loginRoute })
fastify.post('/auth/register', { schema: { hide: true }, handler: registerRoute })
fastify.delete('/auth/logout', { schema: { hide: true }, handler: logoutRoute })

// USERS routes PROTECTED => require valid token - exclude from swagger docs
fastify.get('/users/', { schema: { hide: true }, preHandler: authenticateToken, handler: getUsers })

// Health check endpoint
fastify.get('/health', async (request, reply) =>
{
	return ({ 
		status: 'healthy', 
		timestamp: new Date().toISOString(),
		services: {
			gateway: 'running',
			documentation: 'available at /docs and /documentation'
		}
	})
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