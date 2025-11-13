import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './event-hanlders.js';

// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

fastify.get('/ws', { websocket: true }, (socket, req) =>
{
	// if the request is invalid, reject it
	let	userId = handleNewConnection(socket, req);
	if (!userId)
		return ;

	socket.on('message', msg => {handleMessage(socket, msg, userId);});

	socket.on('close', () => {handleClose(socket, userId);});

	socket.on('error', (err) => {handleError(socket, err);});
});

import { checkEnvVariables } from './notification-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

// Setup Swagger documentation
import { setupSwagger } from './notification-swagger.js';
await setupSwagger(fastify);

import { notificationRoutes } from './notification-routes.js';

const	start = async () =>
{
	try
	{
		await fastify.listen({ port: process.env.PORT, host: '0.0.0.0' })
		console.log(`Server is running on port ws://localhost:${process.env.PORT}/ws`)

		// Setup routes after database is initialized
		fastify.register(notificationRoutes);
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()