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

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { UsersDatabase } from './users_db.js';
let		usersDatabase;

// Validate required environment variables
import { checkEnvVariables } from './users_help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

// Setup Swagger documentation
import { setupSwagger } from './users_swagger.js';
await setupSwagger(fastify);

// Setup routes
import { userRoutes } from './users_routes.js';

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