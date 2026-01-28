import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

import { checkEnvVariables } from './pong-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT', 'NOTIFICATION_SERVICE_URL', 'USERS_SERVICE_URL', 'READY_COOLDOWN_MS',
	'MATCHMAKING_IGNORE_BLOCKS', 'WINNING_SCORE', 'EARNED_WIN_POINTS' ,'LOST_LOSS_POINTS', 'PLACEHOLDER_DELETED_USERNAMES',
	'COOLDOWN_BETWEEN_POINTS_MS', 'PADDLE_HEIGHT', 'PADDLE_SPEED', 'MAX_BOUNCE_ANGLE', 'BALL_RADIUS', 'BALL_INITIAL_SPEED', 'BALL_SPEED_FACTOR',
	'BALL_MAX_SPEED', 'MIN_PLAYERS_FOR_TOURNAMENT_START', 'ROUND_TRANSITION_COOLDOWN_MS', 'TRIS_SERVICE_URL', 'TOURNAMENT_EARNED_WIN_POINTS'] );

import { PongDatabase } from './pong-db.js';
let		pongDatabase;

// Setup Swagger documentation
import { setupSwagger } from './pong-swagger.js';
await setupSwagger(fastify);

import { pongRoutes } from './pong-routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		pongDatabase = new PongDatabase()
		await pongDatabase.initialize()

		// Make database available to all routes
		fastify.decorate('pongDb', pongDatabase)
		// Setup routes before starting the server
		fastify.register(pongRoutes);

		// await fastify.listen({ port: process.env.PORT })
		// console.log(`[PONG] Server is running on localhost:${process.env.PORT}`)
		// console.log(`[PONG] Web socket is listening on ws://localhost:${process.env.PORT}/ws`)
		const HOST = process.env.HOST || '0.0.0.0'
        await fastify.listen({ port: Number(process.env.PORT), host: HOST })
        console.log(`[PONG] Server is running on ${HOST}:${process.env.PORT}`)
		console.log(`[PONG] Web socket is listening on ws://${HOST}:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()

// Export the initialized database instance -> so it can be used in GameManager
export { pongDatabase };