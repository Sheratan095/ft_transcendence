import Fastify from 'fastify';
import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

const	fastify = Fastify({
	logger: false,
	ajv:
	{
		plugins: [ajvErrors],
		customOptions: { allErrors: true } // show all errors, not just the first
	}
});



// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { AuthDatabase } from './auth_db.js';
let		authDatabase;

// Validate required environment variables
import { checkEnvVariables } from './auth_help.js';
checkEnvVariables(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'INTERNAL_API_KEY', 'PORT', 'HASH_SALT_ROUNDS', 'ACCESS_TOKEN_EXPIRATION']);

// Setup Swagger documentation
import { setupSwagger } from './auth_swagger.js';
await setupSwagger(fastify);

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