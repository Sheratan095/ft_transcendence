import Fastify from 'fastify';
import ajvErrors from 'ajv-errors';

const	fastify = Fastify({
	logger: false,
	ajv: // Allows to add specific reply message for each failed "validation" in route schema
	{
		plugins: [ajvErrors],
		customOptions: { allErrors: true } // show all errors, not just the first
	}
});

// import fastifyWebsocket from '@fastify/websocket';

// await fastify.register(fastifyWebsocket);

// fastify.get('/ws', { websocket: true }, (connection, req) => {
//   console.log('Client connected');
//   connection.socket.on('message', msg => console.log('WS message:', msg));
// });

// Validate required environment variables
// import { checkEnvVariables } from './notification-help.js';
// checkEnvVariables(['INTERNAL_API_KEY', 'PORT']);

// Setup Swagger documentation
import { setupSwagger } from './notification-swagger.js';
await setupSwagger(fastify);

const	start = async () =>
{
	try
	{
		// Initialize database
		// authDatabase = new AuthDatabase()
		// await authDatabase.initialize()

		// // Make database available to all routes
		// fastify.decorate('authDb', authDatabase)

		// // Setup routes after database is initialized
		// fastify.register(authRoutes)

		fastify.listen({ port: process.env.PORT })
		console.log(`Server is running on port ${process.env.PORT}`)
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()