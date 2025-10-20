import Fastify from 'fastify'
// Initialize Fastify instance with built-in logging
const	fastify = Fastify({ logger: false })

import cors from '@fastify/cors';
await fastify.register(cors, {
  origin: '*'  // for testing only; restrict to your domain in production
});

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Register aggregated documentation from all microservices
import SwaggerAggregator from './swagger_aggregator.js';
const	swaggerAggregator = new SwaggerAggregator();
await swaggerAggregator.register(fastify);

// Validate required environment variables
import { checkEnvVariables } from './gateway_help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'AUTH_SERVICE_URL', 'USERS_SERVICE_URL', 'PORT']);

import { authenticateJwtToken } from './gateway_help.js';


import {
	loginRoute,
	registerRoute,
	logoutRoute,
	tokenRoute
} from './routes/auth_routes.js'

import {
	getUsers
} from './routes/users_routes.js'


// Schema hiding for routes that should not appear in Swagger docs (they are just proxies)

// AUTH routes do not require authentication, in logout and token refresh the user is identified via the refresh_token
fastify.post('/auth/login', { schema: { hide: true }, handler: loginRoute })
fastify.post('/auth/register', { schema: { hide: true }, handler: registerRoute })
fastify.delete('/auth/logout', { schema: { hide: true }, handler: logoutRoute })
fastify.post('/auth/token', { schema: { hide: true }, handler: tokenRoute })

// USERS routes PROTECTED => require valid token - exclude from swagger docs
fastify.get('/users/', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getUsers })

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