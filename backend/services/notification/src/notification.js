import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

import { checkEnvVariables } from './notification-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT', 'USERS_SERVICE_URL',
	'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'HOST']);

// Setup Swagger documentation
import { setupSwagger } from './notification-swagger.js';
await setupSwagger(fastify);

import { notificationRoutes } from './notification-routes.js';

const	start = async () =>
{
	try
	{
		// Setup routes before starting the server
		fastify.register(notificationRoutes);

		await fastify.listen({ port: process.env.PORT, host: process.env.HOST })
		console.log(`[NOTIFICATION] Server is running on ${process.env.HOST}:${process.env.PORT}`)
		console.log(`[NOTIFICATION] Web socket is listening on ws://${process.env.HOST}:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()