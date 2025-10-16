import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// import { AuthDatabase } from './auth_db.js';
// let		authDatabase;

// Validate required environment variables
import { checkEnvVariables } from './users_help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

// Setup routes
import { userRoutes } from './users_routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		// authDatabase = new AuthDatabase()
		// await authDatabase.initialize()

		// Make database available to all routes
		// fastify.decorate('authDb', authDatabase)

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