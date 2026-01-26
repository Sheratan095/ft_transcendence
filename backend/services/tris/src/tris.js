import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

import { checkEnvVariables } from './tris-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT', 'NOTIFICATION_SERVICE_URL', 'USERS_SERVICE_URL', 'MAX_MARKS_PER_PLAYER',
	'READY_COOLDOWN_MS', 'MOVE_TIMEOUT_MS' , 'MATCHMAKING_IGNORE_BLOCKS', 'EARNED_WIN_POINTS', 'LOST_LOSS_POINTS',
	'PLACEHOLDER_DELETED_USERNAMES', 'PONG_SERVICE_URL' ]);

import { TrisDatabase } from './tris-db.js';
let		trisDatabase;

// Setup Swagger documentation
import { setupSwagger } from './tris-swagger.js';
await setupSwagger(fastify);

import { trisRoutes } from './tris-routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		trisDatabase = new TrisDatabase()
		await trisDatabase.initialize()

		// Make database available to all routes
		fastify.decorate('trisDb', trisDatabase)
		// Setup routes before starting the server
		fastify.register(trisRoutes);

		await fastify.listen({ port: process.env.PORT })
		console.log(`[TRIS] Server is running on localhost:${process.env.PORT}`)
		console.log(`[TRIS] Web socket is listening on ws://localhost:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()

// Export the initialized database instance -> so it can be used in GameManager
export { trisDatabase };