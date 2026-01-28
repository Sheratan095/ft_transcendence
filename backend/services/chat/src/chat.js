import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

import { checkEnvVariables } from './chat-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT', 'USERS_SERVICE_URL', 'NOTIFICATION_SERVICE_URL', 'HOST']);

import { ChatDatabase } from './chat-db.js';
let		chatDatabase;

// Setup Swagger documentation
import { setupSwagger } from './chat-swagger.js';
await setupSwagger(fastify);

import { chatRoutes } from './chat-routes.js';

const	start = async () =>
{
	try
	{
		// Initialize database
		chatDatabase = new ChatDatabase();
		await chatDatabase.initialize();

		// Make database available to all routes
		fastify.decorate('chatDb', chatDatabase);

		// Setup routes before starting the server
		fastify.register(chatRoutes);

		await fastify.listen({ port: process.env.PORT, host: process.env.HOST })
		console.log(`[CHAT] Server is running on ${process.env.HOST}:${process.env.PORT}`)
		console.log(`[CHAT] Web socket is listening on ws://${process.env.HOST}:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()