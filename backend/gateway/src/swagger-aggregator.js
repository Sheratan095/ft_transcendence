import axios from 'axios';
import fastifyBasicAuth from '@fastify/basic-auth';

/**
 * Swagger Aggregator - Combines API documentation from multiple microservices
 */
export class	SwaggerAggregator
{
	constructor()
	{
		// Automatically discover services from environment variables
		this.services = this.discoverServices();
	}

	/**
	 * Automatically discover microservices from environment variables
	 * @returns {Array} Array of service configurations
	 */
	discoverServices()
	{
		const	services = [];

		// Auto-discover services based on environment variables
		if (process.env.AUTH_SERVICE_URL)
		{
			services.push({
				name: 'auth',
				url: `${process.env.AUTH_SERVICE_URL}/docs/json`,
				pathPrefix: '/auth'});
		}

		if (process.env.USERS_SERVICE_URL)
		{
			services.push({
				name: 'users',
				url: `${process.env.USERS_SERVICE_URL}/docs/json`,
				pathPrefix: '/users'});
		}

		if (process.env.NOTIFICATION_SERVICE_URL)
		{
			services.push({
				name: 'notification',
				url: `${process.env.NOTIFICATION_SERVICE_URL}/docs/json`,
				pathPrefix: '/notification'});
		}

		// Future services can be added here automatically
		// if (process.env.GAMES_SERVICE_URL) {
		//     services.push({
		//         name: 'games',
		//         url: `${process.env.GAMES_SERVICE_URL}/documentation/json`,
		//         pathPrefix: '/games'
		//     });
		// }

		console.log(`📡 Discovered ${services.length} microservices:`, services.map(s => s.name));

		return (services);
	}

	/**
	 * Fetches and aggregates OpenAPI specifications from all registered services
	 * @returns {Object} Unified OpenAPI specification
	 */
	async	getAggregatedSpec()
	{
		try
		{
			const	specs = await Promise.allSettled(
				this.services.map(async (service) =>
				{
					try
					{
						const	response = await axios.get(service.url,
						{
							timeout: 5000,
							headers: {'x-internal-api-key': process.env.INTERNAL_API_KEY}
						});

						return ({ 
							name: service.name, 
							pathPrefix: service.pathPrefix,
							spec: response.data,
							status: 'success'
						});
					}
					catch (error)
					{
						console.warn(`⚠️  Failed to fetch docs from ${service.name}: ${error.message}`);

						return ({
							name: service.name,
							pathPrefix: service.pathPrefix,
							spec: null,
							status: 'failed',
							error: error.message
						});
					}
				})
			);

			// Filter successful specs
			const	successfulSpecs = specs
				.filter(result => result.status === 'fulfilled' && result.value.spec)
				.map(result => result.value);

			console.log(`📚 Successfully aggregated docs from ${successfulSpecs.length}/${this.services.length} services`);

			return (this.mergeSpecs(successfulSpecs));
		}
		catch (error)
		{
			console.error('❌ Error aggregating specs:', error);
			return (this.getFallbackSpec());
		}
	}

	/**
	 * Merges multiple OpenAPI specifications into a single unified spec
	 * @param {Array} specs - Array of service specifications
	 * @returns {Object} Merged OpenAPI specification
	 */
	mergeSpecs(specs)
	{
		const	baseSpec =
		{
			swagger: '2.0',
			info:
			{
				title: 'ft_transcendence API Gateway',
				description: 'Unified API documentation for all microservices',
				version: '1.0.0'
			},
			host: 'localhost:3000',
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			paths: {},
			definitions: {},
			// Security definitions for API key authentication, available on swagger UI
			securityDefinitions:
			{
				internalApiKey:
				{
					type: 'apiKey',
					name: 'x-internal-api-key',
					in: 'header'
				}
			},
			tags: []
		};

		// Merge specifications
		specs.forEach(({ name, pathPrefix, spec }) =>
		{
			if (!spec)
				return ;

			// Add service tag
			baseSpec.tags.push(
			{
				name: name.charAt(0).toUpperCase() + name.slice(1),
				description: `${name.charAt(0).toUpperCase() + name.slice(1)} service endpoints`
			});

			// Merge paths with prefix: /auth ("placeholder for localhost:300N") + /register (endpoint in microservice)
			if (spec.paths)
			{
				Object.entries(spec.paths).forEach(([path, methods]) =>
				{
					const	prefixedPath = pathPrefix + path;
					baseSpec.paths[prefixedPath] = {};

					Object.entries(methods).forEach(([method, operation]) =>
					{
						baseSpec.paths[prefixedPath][method] =
						{
							...operation,
							tags: [name.charAt(0).toUpperCase() + name.slice(1)]
						};
					});
				});
			}

			// Merge definitions (Swagger 2.0 equivalent of components/schemas)
			if (spec.definitions)
			{
				Object.entries(spec.definitions).forEach(([schemaName, schema]) =>
				{
					// Prefix schema names to avoid conflicts
					const	prefixedName = `${name.charAt(0).toUpperCase() + name.slice(1)}${schemaName}`;
					baseSpec.definitions[prefixedName] = schema;
				});
			}

			// Merge security definitions (only if they have valid structure)
			if (spec.securityDefinitions)
			{
				Object.entries(spec.securityDefinitions).forEach(([key, value]) =>
				{
					// Only add if the security definition has the required properties
					if (value && value.type && value.name && value.in)
						baseSpec.securityDefinitions[key] = value;
				});
			}
		});

		return (baseSpec);
	}

	/**
	 * Returns a fallback specification when aggregation fails
	 * @returns {Object} Fallback OpenAPI specification
	 */
	getFallbackSpec()
	{
		return ({
			swagger: '2.0',
			info: {
				title: 'ft_transcendence API Gateway',
				description: 'API documentation (some services may be unavailable)',
				version: '1.0.0'
			},
			host: 'localhost:3000',
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			paths: {},
			securityDefinitions:
			{
				bearerAuth:
				{
					type: 'apiKey',
					name: 'Authorization',
					in: 'header'
				}
			}
		});
	}

	/**
	 * Registers the aggregated Swagger UI with Fastify
	 * @param {Object} fastify - Fastify instance
	 */

	async	register(fastify)
	{
		// Get the aggregated spec
		const	aggregatedSpec = await this.getAggregatedSpec();

		// Register the Swagger plugin with the aggregated specification
		await fastify.register(import('@fastify/swagger'), { swagger: aggregatedSpec });

		// Register basic auth for protecting docs
		await fastify.register(fastifyBasicAuth,
		{
			validate: async (username, password, req, reply) =>
			{
				if ( username !== process.env.DOC_USERNAME || password !== process.env.DOC_PASSWORD )
					return (new Error('Unauthorized'));
			},
			authenticate: { realm: 'Swagger Documentation' }
		});

		// Register the unified documentation route with basic auth protection
		await fastify.register(async function (fastify)
		{
			// Apply basic auth hook to all routes in this scope
			fastify.addHook('onRequest', fastify.basicAuth);

			await fastify.register(import('@fastify/swagger-ui'),
			{
				routePrefix: '/docs',
				uiConfig:
				{
					docExpansion: 'list',
					deepLinking: true
				},
				staticCSP: true
			});
		});

		console.log('📚 Swagger aggregator registered at /docs');
	}
}

export default (SwaggerAggregator);