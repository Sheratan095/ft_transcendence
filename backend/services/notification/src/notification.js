import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import UserConnectionManager from './UserConnectionManager.js';
export	const	userConnectionManager = new UserConnectionManager();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

fastify.get('/ws', { websocket: true }, (socket, req) =>
{
	// Extract user data from request (set by gateway after authentication)
	const	user = req.user || null;
	
	if (user)
		console.log(`✅ WebSocket client connected - User: ${user.id}`);
	
	socket.on('message', msg =>
	{
		console.log("📩 Message from user:", msg.toString());

		userConnectionManager.addConnection(user.id, socket);

		// You can now use user.id and user.email in your WebSocket logic
		if (user)
		{
			socket.send(`Echo from ${user.email}: ${msg.toString()}`);
		}
		else
		{
			socket.send("Echo: " + msg.toString());
		}
	});

	socket.on('close', () =>
	{
		userConnectionManager.removeConnection(user.id);

		if (user)
			console.log(`❌ WebSocket connection closed - User: ${user.id}`);
	});

	socket.on('error', (err) =>
	{
		console.log('⚠️ WebSocket error:', err.message);
	});
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