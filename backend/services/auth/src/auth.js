import Fastify from 'fastify';
import ajvErrors from 'ajv-errors';

const	fastify = Fastify({
	logger: false,
	ajv: // Allows to add specific reply message for each failed "validation" in route schema
	{
		plugins: [ajvErrors],
		customOptions: { allErrors: true } // show all errors, not just the first
	}
});

import cookie from "@fastify/cookie";
fastify.register(cookie, {
//    secret: process.env.COOKIE_SECRET, // for signed cookies (optional)
//    Signed cookies allow the server to detect tampering, but they do not hide the data
});

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { AuthDatabase } from './auth-db.js';
let		authDatabase;

// Validate required environment variables
import { checkEnvVariables } from './auth-help.js';
checkEnvVariables(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'INTERNAL_API_KEY', 'PORT', 'HASH_SALT_ROUNDS', 'ACCESS_TOKEN_EXPIRATION',
	'USERS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'REFRESH_TOKEN_EXPIRATION_DAYS', 'OTP_EXPIRATION_MINUTES']);

// Setup Swagger documentation
import { setupSwagger } from './auth-swagger.js';
await setupSwagger(fastify);

// Setup routes
import { authRoutes } from './auth-routes.js';

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
		console.log(`[AUTH] Server is running on port ${process.env.PORT}`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()