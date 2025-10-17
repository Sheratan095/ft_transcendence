import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { AuthDatabase } from './auth_db.js';
let		authDatabase;

// Validate required environment variables
import { checkEnvVariables } from './auth_help.js';
checkEnvVariables(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'INTERNAL_API_KEY', 'PORT', 'HASH_SALT_ROUNDS', 'ACCESS_TOKEN_EXPIRATION']);

// Setup Swagger documentation
await fastify.register(import('@fastify/swagger'), {
	swagger: {
		info: {
			title: 'Auth Service API',
			description: 'Authentication microservice API',
			version: '1.0.0'
		},
		host: `localhost:${process.env.PORT}`,
		schemes: ['http'],
		consumes: ['application/json'],
		produces: ['application/json'],
		securityDefinitions: {
			bearerAuth: {
				type: 'apiKey',
				name: 'Authorization',
				in: 'header'
			},
			internalApiKey: {
				type: 'apiKey',
				name: 'X-Internal-API-Key',
				in: 'header'
			}
		}
	}
});

await fastify.register(import('@fastify/swagger-ui'), {
	routePrefix: '/documentation',
	uiConfig: {
		docExpansion: 'list',
		deepLinking: true
	}
});

// Setup routes
import { authRoutes } from './auth_routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		authDatabase = new AuthDatabase()
		await authDatabase.initialize()

		// Make database available to all routes
		fastify.decorate('authDb', authDatabase)

		// Setup routes after database is initialized
		fastify.register(authRoutes)

		fastify.listen({ port: process.env.PORT })
		console.log(`Server is running on port ${process.env.PORT}`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()