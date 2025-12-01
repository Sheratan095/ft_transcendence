import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

import { checkEnvVariables } from './pong-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

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

		await fastify.listen({ port: process.env.PORT })
		console.log(`[PONG] Server is running on localhost:${process.env.PORT}`)
		console.log(`[PONG] Web socket is listening on ws://localhost:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()