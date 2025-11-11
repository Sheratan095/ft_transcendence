import Fastify from 'fastify';
const	fastify = Fastify({ logger: false });

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Register WebSocket plugin
import fastifyWebsocket from '@fastify/websocket';
await fastify.register(fastifyWebsocket);

fastify.get('/ws', { websocket: true }, (socket, req) =>
{
	console.log('✅ WebSocket client connected');
	
	socket.on('message', msg =>
	{
		console.log("📩 Message from user:", msg.toString());
		socket.send("Echo: " + msg.toString());
	});

	socket.on('close', () =>
	{
		console.log('❌ WebSocket connection closed');
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

await fastify.listen({ port: 3003, host: '0.0.0.0' });
console.log('🚀 Server running on ws://localhost:3003/ws');

// const	start = async () =>
// {
// 	try
// 	{
// 		await fastify.listen({ port: process.env.PORT, host: '0.0.0.0' })
// 		console.log(`Server is running on port ${process.env.PORT}`)
// 	}
// 	catch (err)
// 	{
// 		fastify.log.error(err)
// 		process.exit(1)
// 	}
// }
// start()