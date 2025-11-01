import Fastify from 'fastify'
// Initialize Fastify instance with built-in logging
const	fastify = Fastify({ logger: false })

// Allows to receive requests from different origins
import cors from '@fastify/cors';
await fastify.register(cors, {
	origin: process.env.FRONTEND_URL,
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
 	credentials: true // Allow cookies to be sent
});

// Register multipart plugin for file uploads
import multipart from '@fastify/multipart';
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// collection of middleware functions for Node.js designed to
// 	secure web applications by setting crucial HTTP headers
import helmet from "@fastify/helmet";
fastify.register(helmet,
{
	contentSecurityPolicy:
	{
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'"],
			objectSrc: ["'none'"],
			baseUri: ["'self'"],
		},
	},
});

// Register static file serving for avatars (proxy to users service)
import proxy from '@fastify/http-proxy';
await fastify.register(proxy, {
  upstream: process.env.USERS_SERVICE_URL,
  prefix: '/avatars',
  rewritePrefix: '/avatars',
});

// Register rate limiting plugin (global: false means we'll apply it selectively)
await fastify.register(import('@fastify/rate-limit'), {
  global: false
});

import cookie from "@fastify/cookie";
fastify.register(cookie, {
//    secret: process.env.COOKIE_SECRET, // for signed cookies (optional)
//    Signed cookies allow the server to detect tampering, but they do not hide the data
});

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Register aggregated documentation from all microservices, { hide: true } in routes' schema is used to exclude routes from Swagger docs
import SwaggerAggregator from './swagger-aggregator.js';
const	swaggerAggregator = new SwaggerAggregator();
await swaggerAggregator.register(fastify);

// Validate required environment variables
import { checkEnvVariables } from './gateway-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'AUTH_SERVICE_URL', 'USERS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'FRONTEND_URL', 'PORT']);

import { authenticateJwtToken } from './gateway-help.js';

import {
	loginRoute,
	registerRoute,
	logoutRoute,
	tokenRoute,
	verifyTwoFactorAuth,
	changePasswordRoute,
	enable2FARoute
} from './routes/auth-routes.js'

import {
	getUsers,
	getUser,
	updateUser,
	uploadAvatar
} from './routes/users-routes.js'

import {
	getUserRelationships,
	getFriends,
	getIncomingRequests,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	blockUser,
	unblockUser,
	cancelFriendRequest,
	removeFriend
} from './routes/relationships-routes.js'

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

// 🟠 AUTHENTICATED USER ACTIONS: Sensitive account changes (requires auth + rate limiting)
await fastify.register(async function (fastify)
{
	await fastify.register(import('@fastify/rate-limit'),
	{
		max: 10,				// Maximum 10 password changes
		timeWindow: '1 hour',	// Per hour
		keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated
	});

	fastify.put('/auth/change-password', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: changePasswordRoute })
	fastify.put('/auth/enable-2fa', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: enable2FARoute })
	fastify.post('/users/upload-avatar', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: uploadAvatar })
	fastify.put('/users/update-user', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: updateUser })
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
	fastify.get('/users/user', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getUser })
	
	// RELATIONSHIPS routes
	fastify.get('/relationships', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getUserRelationships })
	fastify.get('/relationships/friends', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getFriends })
	fastify.get('/relationships/requests', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: getIncomingRequests })
	fastify.post('/relationships/request', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: sendFriendRequest })
	fastify.put('/relationships/accept', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: acceptFriendRequest })
	fastify.put('/relationships/reject', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: rejectFriendRequest })
	fastify.put('/relationships/block', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: blockUser })
	fastify.delete('/relationships/unblock', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: unblockUser })
	fastify.delete('/relationships/removeFriend', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: removeFriend })
	fastify.delete('/relationships/cancelFriendRequest', { schema: { hide: true }, preHandler: authenticateJwtToken, handler: cancelFriendRequest })
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