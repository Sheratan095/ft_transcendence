	/**
	* Swagger documentation setup for Users Service
	* Provides JSON spec only - UI is handled by the gateway aggregator
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

		const	docsRouteOptions =
		{
			schema:
			{
				summary: '🔒 Internal (used by swagger aggregator)',
			}
		}

		// Manually register the JSON endpoint since we're not using swagger-ui
		fastify.get('/docs/json', docsRouteOptions, async (request, reply) =>
		{
			return (fastify.swagger());
		});

		console.log(`📚 Users Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
	}