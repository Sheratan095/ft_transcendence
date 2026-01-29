import Fastify from 'fastify';
import ajvErrors from 'ajv-errors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

const	fastify = Fastify({
	logger: false,
	ajv: // Allows to add specific reply message for each failed "validation" in route schema
	{
		plugins: [ajvErrors],
		customOptions: { allErrors: true } // show all errors, not just the first
	}
});

// Register multipart plugin for file uploads
await fastify.register(multipart,
{
	limits:
	{
		fileSize: 10 * 1024 * 1024, // 10MB max file size
	}
});

// Register static file serving for avatars (protected - only accessible via gateway)
await fastify.register(async function(fastify)
{
	// Validate internal API key before serving avatars
	fastify.addHook('preHandler', async (request, reply) =>
	{
		const	apiKey = request.headers['x-internal-api-key'];
		if (apiKey !== process.env.INTERNAL_API_KEY)
		{
			console.error('[USERS] Unauthorized access attempt to avatars');
			return (reply.code(403).send({ error: 'Forbidden: Direct access not allowed' }));
		}
	});

	// Log when avatar is sent
	fastify.addHook('onSend', async (request, reply, payload) =>
	{
		console.log(`[USERS] Avatar served: ${request.url} -> ${reply.statusCode}`);

		return (payload);
	});

	await fastify.register(fastifyStatic,
	{
		root: path.join(__dirname, '../data/avatars'),
		prefix: '/avatars/', // URL prefix to access avatars
	});
});

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { UsersDatabase } from './users-db.js';
let		usersDatabase;

// Validate required environment variables
import { checkEnvVariables } from './users-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT', 'AUTH_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'HOST', 'PLACEHOLDER_DELETED_USERNAMES']);

// Setup Swagger documentation
import { setupSwagger } from './users-swagger.js';
await setupSwagger(fastify);

// Setup routes
import { userRoutes } from './users-routes.js';
import { relationshipsRoutes } from './relationships-routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		usersDatabase = new UsersDatabase()
		await usersDatabase.initialize()

		// Make database available to all routes
		fastify.decorate('usersDb', usersDatabase)

		// Setup routes after database is initialized
		fastify.register(userRoutes)
		fastify.register(relationshipsRoutes)

		await fastify.listen({ port: process.env.PORT, host: process.env.HOST })
		console.log(`[USERS] Server is running on ${process.env.HOST}:${process.env.PORT}`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()