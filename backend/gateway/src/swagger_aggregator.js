import axios from 'axios';

/**
 * Swagger Aggregator - Combines API documentation from multiple microservices
 */
export class SwaggerAggregator {
	constructor() {
		// Automatically discover services from environment variables
		this.services = this.discoverServices();
	}

	/**
	 * Automatically discover microservices from environment variables
	 * @returns {Array} Array of service configurations
	 */
	discoverServices() {
		const services = [];
		
		// Auto-discover services based on environment variables
		if (process.env.AUTH_SERVICE_URL) {
			services.push({
				name: 'auth',
				url: `${process.env.AUTH_SERVICE_URL}/documentation/json`,
				pathPrefix: '/auth'
			});
		}
		
		if (process.env.USERS_SERVICE_URL) {
			services.push({
				name: 'users',
				url: `${process.env.USERS_SERVICE_URL}/documentation/json`,
				pathPrefix: '/users'
			});
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
		return services;
	}

	/**
	 * Fetches and aggregates OpenAPI specifications from all registered services
	 * @returns {Object} Unified OpenAPI specification
	 */
	async getAggregatedSpec() {
		try {
			console.log('📚 Aggregating API documentation from services...');
			
			const specs = await Promise.allSettled(
				this.services.map(async (service) => {
					try {
						console.log(`📖 Fetching docs from ${service.name}: ${service.url}`);
						const response = await axios.get(service.url, {
							timeout: 5000,
							headers: {
								'x-internal-api-key': process.env.INTERNAL_API_KEY
							}
						});
						console.log(`✅ Successfully fetched docs from ${service.name}`);
						return { 
							name: service.name, 
							pathPrefix: service.pathPrefix,
							spec: response.data,
							status: 'success'
						};
					} catch (error) {
						console.warn(`⚠️  Failed to fetch docs from ${service.name}: ${error.message}`);
						return {
							name: service.name,
							pathPrefix: service.pathPrefix,
							spec: null,
							status: 'failed',
							error: error.message
						};
					}
				})
			);

			// Filter successful specs
			const successfulSpecs = specs
				.filter(result => result.status === 'fulfilled' && result.value.spec)
				.map(result => result.value);

			console.log(`✅ Successfully aggregated docs from ${successfulSpecs.length}/${this.services.length} services`);
			console.log('Successful services:', successfulSpecs.map(s => s.name));

			return this.mergeSpecs(successfulSpecs);
		} catch (error) {
			console.error('❌ Error aggregating specs:', error);
			return this.getFallbackSpec();
		}
	}

	/**
	 * Merges multiple OpenAPI specifications into a single unified spec
	 * @param {Array} specs - Array of service specifications
	 * @returns {Object} Merged OpenAPI specification
	 */
	mergeSpecs(specs) {
		const baseSpec = {
			swagger: '2.0',
			info: {
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
			securityDefinitions: {
				bearerAuth: {
					type: 'apiKey',
					name: 'Authorization',
					in: 'header'
				},
				internalApiKey: {
					type: 'apiKey',
					name: 'x-internal-api-key',
					in: 'header'
				}
			},
			tags: []
		};

		// Merge specifications
		specs.forEach(({ name, pathPrefix, spec }) => {
			if (!spec) return;

			// Add service tag
			baseSpec.tags.push({
				name: name.charAt(0).toUpperCase() + name.slice(1),
				description: `${name.charAt(0).toUpperCase() + name.slice(1)} service endpoints`
			});

			// Merge paths with prefix
			if (spec.paths) {
				Object.entries(spec.paths).forEach(([path, methods]) => {
					const prefixedPath = pathPrefix + path;
					baseSpec.paths[prefixedPath] = {};

					Object.entries(methods).forEach(([method, operation]) => {
						baseSpec.paths[prefixedPath][method] = {
							...operation,
							tags: [name.charAt(0).toUpperCase() + name.slice(1)]
						};
					});
				});
			}

			// Merge definitions (Swagger 2.0 equivalent of components/schemas)
			if (spec.definitions) {
				Object.entries(spec.definitions).forEach(([schemaName, schema]) => {
					// Prefix schema names to avoid conflicts
					const prefixedName = `${name.charAt(0).toUpperCase() + name.slice(1)}${schemaName}`;
					baseSpec.definitions[prefixedName] = schema;
				});
			}

			// Merge security definitions
			if (spec.securityDefinitions) {
				Object.assign(baseSpec.securityDefinitions, spec.securityDefinitions);
			}
		});

		return baseSpec;
	}

	/**
	 * Returns a fallback specification when aggregation fails
	 * @returns {Object} Fallback OpenAPI specification
	 */
	getFallbackSpec() {
		return {
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
			paths: {
				'/health': {
					get: {
						summary: 'Health check',
						responses: {
							'200': {
								description: 'Service is healthy'
							}
						}
					}
				}
			},
			securityDefinitions: {
				bearerAuth: {
					type: 'apiKey',
					name: 'Authorization',
					in: 'header'
				}
			}
		};
	}



	/**
	 * Refreshes the service discovery and re-aggregates specifications
	 * Useful when new services are added or existing ones are updated
	 */
	async refresh() {
		console.log('🔄 Refreshing service discovery...');
		this.services = this.discoverServices();
		return await this.getAggregatedSpec();
	}

	/**
	 * Registers the aggregated Swagger UI with Fastify
	 * @param {Object} fastify - Fastify instance
	 */
	async register(fastify) {
		// Get the aggregated spec
		const aggregatedSpec = await this.getAggregatedSpec();

		// Register the Swagger plugin with the aggregated specification
		await fastify.register(import('@fastify/swagger'), {
			swagger: aggregatedSpec
		});

		// Register the unified documentation route
		await fastify.register(import('@fastify/swagger-ui'), {
			routePrefix: '/docs',
			uiConfig: {
				docExpansion: 'list',
				deepLinking: true
			},
			staticCSP: true
		});

		// Add a refresh endpoint for development
		fastify.get('/docs/refresh', async (request, reply) => {
			try {
				const refreshedSpec = await this.refresh();
				return { 
					message: 'Documentation refreshed successfully',
					services: this.services.map(s => s.name),
					timestamp: new Date().toISOString()
				};
			} catch (error) {
				reply.code(500);
				return { error: 'Failed to refresh documentation', details: error.message };
			}
		});

		console.log('📚 Swagger aggregator registered at /docs');
		console.log('🔄 Documentation refresh available at /docs/refresh');
	}
}

export default SwaggerAggregator;