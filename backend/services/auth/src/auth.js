import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

import { AuthDatabase } from './auth_db.js';

import { checkEnvVariables } from './auth_help.js';
import { authRoutes } from './auth_routes.js';

// Validate required environment variables
checkEnvVariables(['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'INTERNAL_API_KEY']);

const	fastify = Fastify({ logger: false });
let		authDatabase;

// Setup routes
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