import { exit } from 'process';

// Validate required environment variables
import { checkEnvVariables, authenticateJwt } from './gateway-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'AUTH_SERVICE_URL', 'USERS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'CHAT_SERVICE_URL', 
	'PONG_SERVICE_URL', 'TRIS_SERVICE_URL', 'FRONTEND_URL', 'PORT', 'DOC_USERNAME', 'DOC_PASSWORD', 'USE_HTTPS', 'HTTPS_CERTS_PATH',
	'RATE_LIMIT_ACTIVE', 'HOST']);

import Fastify from 'fastify'
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HTTPS Configuration
let	httpsOptions = null;

if (process.env.USE_HTTPS === 'true')
{
	try
	{
		const	certsPath = process.env.CERTS_PATH || path.join(__dirname, process.env.HTTPS_CERTS_PATH);
		httpsOptions =
		{
			key: readFileSync(path.join(certsPath, 'key.pem')),
			cert: readFileSync(path.join(certsPath, 'cert.pem'))
		};
	}
	catch (err)
	{
		console.error('[GATEWAY] Failed to load HTTPS certificates:', err.message);
		console.error('[GATEWAY] Falling back to HTTP');

		exit(1);
	}
}

// Initialize Fastify instance with built-in logging and optional HTTPS
const	fastify = Fastify({ 
	logger: false,
	https: httpsOptions
})

// Allows to receive requests from different origins
import cors from '@fastify/cors';
await fastify.register(cors,
{
	origin: (origin, cb) => {
		// Allow requests from frontend URL and file:// protocol (for testing)
		const	allowedOrigins = [
			process.env.FRONTEND_URL,
			'null', // file:// protocol shows as 'null' // TO DO check it
		];
		
		// Allow any localhost origin for development
		if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin))
			cb(null, true);
		else
			cb(new Error('Not allowed by CORS'), false);
	},

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
			imgSrc: ["'self'", "data:", "blob:"], // Allow images from same origin, data URLs, and blob URLs
		},
	},
});

// Register static file serving for avatars (proxy to users service with auth)
import proxy from '@fastify/http-proxy';
await fastify.register(proxy,
{
	upstream: process.env.USERS_SERVICE_URL,
	prefix: '/avatars',
	rewritePrefix: '/avatars',
	http2: false, // Disable HTTP/2 for better compatibility

	// Add internal API key header before proxying
	preHandler: async (request, reply) =>
	{
		request.headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
	},

	onError: (reply, { error }) =>
	{
		console.error('[GATEWAY] Avatar proxy error:', error.message);
		reply.code(503).send({ error: 'Avatar service temporarily unavailable' });
	}
});

// Add a hook to set CORS headers for avatar responses
fastify.addHook('onSend', async (request, reply, payload) =>
{
	if (request.url.startsWith('/avatars/'))
	{
		const	origin = request.headers.origin;
		reply.header('Access-Control-Allow-Origin', origin || '*');
		reply.header('Access-Control-Allow-Credentials', 'true');
		reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
		reply.header('Cache-Control', 'public, max-age=3600');
	}

	return (payload);
});

// Register rate limiting plugin (global: false means we'll apply it selectively)
await fastify.register(import('@fastify/rate-limit'), { global: false });

import cookie from "@fastify/cookie";
fastify.register(cookie, {
//    secret: process.env.COOKIE_SECRET, // for signed cookies (optional)
//    Signed cookies allow the server to detect tampering, but they do not hide the data
});

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Register aggregated documentation from all microservices, { hide: true } in routes' schema is used to exclude routes from Swagger docs
import SwaggerAggregator from './swagger/swagger-aggregator.js';
const	swaggerAggregator = new SwaggerAggregator();
await swaggerAggregator.register(fastify);

// Import ws handlers
import { handleSocketUpgrade } from './ws-handlers.js'

import {
	login,
	register,
	logout,
	token,
	verifyTwoFactorAuth,
	changePassword,
	enable2FA,
	deleteAccount
} from './routes/auth-routes.js'

import {
	getUsers,
	searchUsers,
	getUser,
	updateUser,
	uploadAvatar,
	getUsersStats,
} from './routes/users-routes.js'


import {
	getUserRelationships,
	getFriends,
	getIncomingRequests,
	getOutgoingRequests,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	blockUser,
	unblockUser,
	cancelFriendRequest,
	removeFriend,
	getUsersRelationship
} from './routes/relationships-routes.js'

import {
	getAllChats,
	getMessages,
	addUserToChat,
	leaveGroupChat,
	createGroupChat,
	createPrivateChat
} from './routes/chat-routes.js'

import {
	getUserStatsRoute,
	getUserMatchHistoryRoute
} from './routes/tris-routes.js'

import {
	getUserStats as getUserStatsHandler,
	getUserMatchHistory as getUserMatchHistoryHandler,
	getAllTournaments as getAllTournamentsHandler,
	createTournament as createTournamentHandler,
} from './routes/pong-routes.js'

// 🔴 STRICT RATE LIMITING: Authentication routes (high security risk)
await fastify.register(async function (fastify)
{
	if (process.env.RATE_LIMIT_ACTIVE === 'true')
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
	}

	// AUTH routes do not require authentication, in logout and token refresh the user is identified via the refresh_token
	fastify.post('/auth/login', { schema: { hide: true }, handler: login })
	fastify.post('/auth/register', { schema: { hide: true }, handler: register })
	fastify.post('/auth/2fa', { schema: { hide: true }, handler: verifyTwoFactorAuth })
});

// 🟡 MODERATE RATE LIMITING: Token and logout routes (moderate risk)
await fastify.register(async function (fastify)
{
	if (process.env.RATE_LIMIT_ACTIVE === 'true')
	{
		await fastify.register(import('@fastify/rate-limit'),
		{
			max: 10,					// Maximum 10 requests
			timeWindow: '5 minutes',	// Per 5-minute window
			keyGenerator: (req) => req.ip // Rate limit by IP for token operations
		});
	}

	fastify.delete('/auth/logout', { schema: { hide: true }, handler: logout })
	fastify.post('/auth/token', { schema: { hide: true }, handler: token })
});

// 🟠 AUTHENTICATED USER ACTIONS: Sensitive account changes (requires auth + rate limiting)
await fastify.register(async function (fastify)
{
	if (process.env.RATE_LIMIT_ACTIVE === 'true')
	{
		await fastify.register(import('@fastify/rate-limit'),
		{
			max: 10,				// Maximum 10 password changes
			timeWindow: '1 hour',	// Per hour
			keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated
		});
	}

	fastify.put('/auth/change-password', { schema: { hide: true }, preHandler: authenticateJwt, handler: changePassword })
	fastify.put('/auth/enable-2fa', { schema: { hide: true }, preHandler: authenticateJwt, handler: enable2FA })
	fastify.delete('/auth/delete-account', { schema: { hide: true }, preHandler: authenticateJwt, handler: deleteAccount })
	fastify.post('/users/upload-avatar', { schema: { hide: true }, preHandler: authenticateJwt, handler: uploadAvatar })
	fastify.put('/users/update-user', { schema: { hide: true }, preHandler: authenticateJwt, handler: updateUser })
});

// 🟢 RELAXED RATE LIMITING: General user routes (low risk, read operations)
await fastify.register(async function (fastify)
{
	if (process.env.RATE_LIMIT_ACTIVE === 'true')
	{
		await fastify.register(import('@fastify/rate-limit'),
		{
			max: 100,					// Maximum 100 requests
			timeWindow: '1 minute',		// Per minute
			keyGenerator: (req) => req.user?.id || req.ip // Rate limit by user ID if authenticated
		});
	}

	// USERS routes PROTECTED => require valid token - exclude from swagger docs
	fastify.get('/users/', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUsers })
	fastify.get('/users/user', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUser })

	// TRIS routes
	fastify.get('/tris/stats', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUserStatsRoute })
	fastify.get('/tris/history', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUserMatchHistoryRoute })
	
	// RELATIONSHIPS routes
	fastify.get('/users/relationships', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUserRelationships })
	fastify.get('/users/relationships/friends', { schema: { hide: true }, preHandler: authenticateJwt, handler: getFriends })
	fastify.get('/users/relationships/requests/incoming', { schema: { hide: true }, preHandler: authenticateJwt, handler: getIncomingRequests })
	fastify.get('/users/relationships/requests/outgoing', { schema: { hide: true }, preHandler: authenticateJwt, handler: getOutgoingRequests })
	fastify.get('/users/relationships/getUsersRelationship', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUsersRelationship })
	fastify.post('/users/relationships/request', { schema: { hide: true }, preHandler: authenticateJwt, handler: sendFriendRequest })
	fastify.put('/users/relationships/accept', { schema: { hide: true }, preHandler: authenticateJwt, handler: acceptFriendRequest })
	fastify.put('/users/relationships/reject', { schema: { hide: true }, preHandler: authenticateJwt, handler: rejectFriendRequest })
	fastify.put('/users/relationships/block', { schema: { hide: true }, preHandler: authenticateJwt, handler: blockUser })
	fastify.delete('/users/relationships/unblock', { schema: { hide: true }, preHandler: authenticateJwt, handler: unblockUser })
	fastify.delete('/users/relationships/removeFriend', { schema: { hide: true }, preHandler: authenticateJwt, handler: removeFriend })
	fastify.delete('/users/relationships/cancelFriendRequest', { schema: { hide: true }, preHandler: authenticateJwt, handler: cancelFriendRequest })

	// CHAT routes
	fastify.get('/chat/', { schema: { hide: true }, preHandler: authenticateJwt, handler: getAllChats })
	fastify.get('/chat/messages', { schema: { hide: true }, preHandler: authenticateJwt, handler: getMessages })
	fastify.post('/chat/add-user', { schema: { hide: true }, preHandler: authenticateJwt, handler: addUserToChat })
	fastify.post('/chat/leave-group-chat', { schema: { hide: true }, preHandler: authenticateJwt, handler: leaveGroupChat })
	fastify.post('/chat/create-group-chat', { schema: { hide: true }, preHandler: authenticateJwt, handler: createGroupChat })
	fastify.post('/chat/start-private-chat', { schema: { hide: true }, preHandler: authenticateJwt, handler: createPrivateChat })

	// PONG routes
	fastify.get('/pong/stats', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUserStatsHandler })
	fastify.get('/pong/history', { schema: { hide: true }, preHandler: authenticateJwt, handler: getUserMatchHistoryHandler })
	fastify.get('/pong/get-all-tournaments', { schema: { hide: true }, preHandler: authenticateJwt, handler: getAllTournamentsHandler })
	fastify.post('/pong/create-tournament', { schema: { hide: true }, preHandler: authenticateJwt, handler: createTournamentHandler })
});

// SEARCH route – tighter rate limit
await fastify.register(async function (fastify)
{
	if (process.env.RATE_LIMIT_ACTIVE === 'true')
	{
		await fastify.register(import('@fastify/rate-limit'),
		{
			max: 20,					// 20 search attempts
			timeWindow: '10 seconds',	// every 10 seconds
			keyGenerator: (req) => req.user?.id || req.ip
		});
	}

	fastify.get('/users/search',{ schema: { hide: true }, preHandler: authenticateJwt, handler: searchUsers });
	fastify.get('/users/stats',{ schema: { hide: true }, handler: getUsersStats });
});

// Server startup function with error handling
const	start = async () =>
{
	try
	{
		await fastify.listen({port: process.env.PORT, host: process.env.HOST }, () =>
		{
			// When the client sends an Upgrade request (tries to establish a WebSocket connection)
			fastify.server.on('upgrade', (request, socket, head) => handleSocketUpgrade(request, socket, head));
		})

		const	protocol = httpsOptions ? 'https' : 'http';

		console.log(`[GATEWAY] Server is running:`);
		console.log(`[GATEWAY] Protocol: ${protocol} `);
		console.log(`[GATEWAY] URL: ${protocol}://${process.env.HOST}:${process.env.PORT}`);
		console.log(`[GATEWAY] Rate limiting: ${process.env.RATE_LIMIT_ACTIVE === 'true' ? 'Enabled' : 'Disabled'}`);
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