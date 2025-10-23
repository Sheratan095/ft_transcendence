import Fastify from 'fastify'
// Initialize Fastify instance with built-in logging
const	fastify = Fastify({ logger: false })

// Allows to receive requests from different origins
import cors from '@fastify/cors';
await fastify.register(cors, {
  origin: '*'  // for testing only; restrict to your domain in production TO DO
});

// Register rate limiting plugin (global: false means we'll apply it selectively)
await fastify.register(import('@fastify/rate-limit'), {
  global: false
});

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Register aggregated documentation from all microservices, { hide: true } in routes' schema is used to exclude routes from Swagger docs
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
	tokenRoute,
	verifyTwoFactorAuth,
	changePasswordRoute,
	enable2FARoute
} from './routes/auth_routes.js'

import {
	getUsers,
	getUser
} from './routes/users_routes.js'

// 🔴 STRICT RATE LIMITING: Authentication routes (high security risk)
await fastify.register(async function (fastify)
{
	await fastify.register(import('@fastify/rate-limit'),
	{
		max: 5,						// Maximum 5 attempts
		timeWindow: '5 minutes',	// Per 5-minute window
		keyGenerator: (req) => { return req.body?.username || req.body?.email || req.ip; }, // Rate limit by username (if provided) or IP address
		errorResponseBuilder: (req, context) =>
		{
			return ({
				statusCode: 429,
				error: 'Too Many Requests',
				message: 'Rate limit exceeded. Please try again later.',
				retryAfter: Math.round(context.ttl / 1000) // seconds until reset
			});
		}
	});

	// AUTH routes do not require authentication, in logout and token refresh the user is identified via the refresh_token
	fastify.post('/auth/login', { schema: { hide: true }, handler: loginRoute })
	fastify.post('/auth/register', { schema: { hide: true }, handler: registerRoute })
	fastify.post('/auth/2fa', { schema: { hide: true }, handler: verifyTwoFactorAuth })
});

// 🟡 MODERATE RATE LIMITING: Token and logout routes (moderate risk)
await fastify.register(async function (fastify)
{
	await fastify.register(import('@fastify/rate-limit'),
	{
		max: 10,					// Maximum 10 requests
		timeWindow: '5 minutes',	// Per 5-minute window
		keyGenerator: (req) => req.ip // Rate limit by IP for token operations
	});

	fastify.delete('/auth/logout', { schema: { hide: true }, handler: logoutRoute })
	fastify.post('/auth/token', { schema: { hide: true }, handler: tokenRoute })
});

// 🟠 AUTHENTICATED USER ACTIONS: Password changes (requires auth + rate limiting)
await fastify.register(async function (fastify)
{
	await fastify.register(import('@fastify/rate-limit'),
	{
		max: 3,					// Maximum 3 password changes
		timeWindow: '1 hour',	// Per hour
		keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated
	});

	fastify.put('/auth/change-password', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: changePasswordRoute })
	fastify.put('/auth/enable-2fa', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: enable2FARoute })
});

// 🟢 RELAXED RATE LIMITING: General user routes (low risk, read operations)
await fastify.register(async function (fastify)
{
	await fastify.register(import('@fastify/rate-limit'),
	{
		max: 100,					// Maximum 100 requests
		timeWindow: '1 minute',		// Per minute
		keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated
	});

	// USERS routes PROTECTED => require valid token - exclude from swagger docs
	fastify.get('/users/', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getUsers })
	fastify.get('/users/:username', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getUser })
});

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