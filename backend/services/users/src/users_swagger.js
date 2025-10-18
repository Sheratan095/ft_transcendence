/**
 * Swagger documentation setup for Users Service
 */
export async function	setupSwagger(fastify)
{
	// Setup Swagger documentation
	await fastify.register(import('@fastify/swagger'),
	{
		swagger:
		{
			info:
			{
				title: 'Users Service API',
				description: 'Users microservice API',
				version: '1.0.0'
			},
			host: `localhost:${process.env.PORT}`,
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			securityDefinitions:
			{
				bearerAuth:
				{
					type: 'apiKey',
					name: 'Authorization',
					in: 'header'
				},
				internalApiKey:
				{
					type: 'apiKey',
					name: 'x-internal-api-key',
					in: 'header'
				}
			}
		}
	});

	await fastify.register(import('@fastify/swagger-ui'),
	{
		routePrefix: '/docs',
		uiConfig:
		{
			docExpansion: 'list',
			deepLinking: true
		}
	});

	console.log(`📚 Users Service Swagger UI available at http://localhost:${process.env.PORT}/docs`);
}