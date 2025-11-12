import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import {
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
	// Extract user data from request (set by gateway after authentication)
	const	user = req.user;
	
	console.log(`✅ WebSocket client connected - User: ${user.id}`);
	userConnectionManager.addConnection(user.id, socket);

	socket.on('message', msg => {handleMessage(socket, msg, user);});

	socket.on('close', () => {handleClose(socket, user);});

	socket.on('error', (err) => {handleError(socket, err);});
});

import { checkEnvVariables } from './notification-help.js';
checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

// Setup Swagger documentation
import { setupSwagger } from './notification-swagger.js';
await setupSwagger(fastify);

const	start = async () =>
{
	try
	{
		await fastify.listen({ port: process.env.PORT, host: '0.0.0.0' })
		console.log(`Server is running on port ws://localhost:${process.env.PORT}/ws`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()