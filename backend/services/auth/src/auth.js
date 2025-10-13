import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { AuthDatabase } from './auth_db.js';
let		authDatabase;

// Validate required environment variables
import { checkEnvVariables } from './auth_help.js';
checkEnvVariables(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'INTERNAL_API_KEY']);

// Setup routes
import { authRoutes } from './auth_routes.js';
fastify.register(authRoutes)

const	start = async () =>
{
	try
	{
		// Initialize database
		authDatabase = new AuthDatabase()
		await authDatabase.initialize()

		const port = process.env.PORT || 4000;
		const host = process.env.HOST || '0.0.0.0';
		
		await fastify.listen({ port: port, host: host })
		console.log(`Server is running on ${host}:${port}`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()