import axios from 'axios';

/**
 * Swagger Aggregator - Combines API documentation from multiple microservices
 */
export class SwaggerAggregator {
	constructor() {
		this.services = [
			{ 
				name: 'auth', 
				url: `${process.env.AUTH_SERVICE_URL}/documentation/json`,
				pathPrefix: '/auth'
			},
			{ 
				name: 'users', 
				url: `${process.env.USERS_SERVICE_URL}/documentation/json`,
				pathPrefix: '/users'
			}
			// Add more services as needed
		];
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
								'X-Internal-API-Key': process.env.INTERNAL_API_KEY
							}
						});
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
			openapi: '3.0.0',
			info: {
				title: 'ft_transcendence API Gateway',
				description: 'Unified API documentation for all microservices',
				version: '1.0.0'
			},
			servers: [
				{
					url: 'http://localhost:3000',
					description: 'Gateway Server'
				}
			],
			paths: {},
			components: {
				schemas: {},
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					}
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

			// Merge components/schemas
			if (spec.components?.schemas) {
				Object.entries(spec.components.schemas).forEach(([schemaName, schema]) => {
					// Prefix schema names to avoid conflicts
					const prefixedName = `${name.charAt(0).toUpperCase() + name.slice(1)}${schemaName}`;
					baseSpec.components.schemas[prefixedName] = schema;
				});
			}

			// Merge other components if needed
			if (spec.components?.securitySchemes) {
				Object.assign(baseSpec.components.securitySchemes, spec.components.securitySchemes);
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
			openapi: '3.0.0',
			info: {
				title: 'ft_transcendence API Gateway',
				description: 'API documentation (some services may be unavailable)',
				version: '1.0.0'
			},
			servers: [
				{
					url: 'http://localhost:3000',
					description: 'Gateway Server'
				}
			],
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
				},
				...this.getManualServicePaths()
			},
			components: {
				securitySchemes: {
					bearerAuth: {
						type: 'http',
						scheme: 'bearer',
						bearerFormat: 'JWT'
					}
				}
			}
		};
	}

	/**
	 * Provides manual documentation for services that don't have Swagger yet
	 * @returns {Object} Manual API paths
	 */
	getManualServicePaths() {
		return {
			'/auth/register': {
				post: {
					tags: ['Auth'],
					summary: 'Register a new user',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['username', 'password', 'email'],
									properties: {
										username: { type: 'string' },
										password: { type: 'string' },
										email: { type: 'string', format: 'email' }
									}
								}
							}
						}
					},
					responses: {
						'201': {
							description: 'User registered successfully'
						},
						'409': {
							description: 'Username or email already exists'
						}
					}
				}
			},
			'/auth/login': {
				post: {
					tags: ['Auth'],
					summary: 'Login with username/email and password',
					requestBody: {
						required: true,
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['password'],
									properties: {
										username: { type: 'string' },
										email: { type: 'string', format: 'email' },
										password: { type: 'string' }
									}
								}
							}
						}
					},
					responses: {
						'200': {
							description: 'Login successful'
						},
						'401': {
							description: 'Invalid credentials'
						}
					}
				}
			},
			'/users/': {
				get: {
					tags: ['Users'],
					summary: 'Get all users (protected)',
					security: [{ bearerAuth: [] }],
					responses: {
						'200': {
							description: 'List of users'
						},
						'401': {
							description: 'Unauthorized'
						}
					}
				}
			}
		};
	}

	/**
	 * Registers the aggregated Swagger UI with Fastify
	 * @param {Object} fastify - Fastify instance
	 */
	async register(fastify) {
		// First register the base Swagger plugin
		await fastify.register(import('@fastify/swagger'), {
			swagger: {
				info: {
					title: 'ft_transcendence Aggregated API',
					description: 'Combined documentation from all microservices',
					version: '1.0.0'
				}
			},
			hide: true // Hide the default swagger routes since we're using custom aggregation
		});

		// Register the unified documentation route
		await fastify.register(import('@fastify/swagger-ui'), {
			routePrefix: '/docs',
			uiConfig: {
				docExpansion: 'list',
				deepLinking: true
			},
			transformSpecification: async () => await this.getAggregatedSpec()
		});

		console.log('📚 Swagger aggregator registered at /docs');
	}
}

export default SwaggerAggregator;