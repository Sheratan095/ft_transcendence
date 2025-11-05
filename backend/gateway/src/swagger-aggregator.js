import axios from "axios";
import fastifyBasicAuth from "@fastify/basic-auth";

export class	SwaggerAggregator
{
	constructor()
	{
		this.services = this.discoverServices();
		this.currentSpec = null;
	}

	discoverServices()
	{
		const	services = [];

		const	add = (env, name, prefix) =>
		{
			if (process.env[env])
			{
				services.push(
				{
					name,
					url: `${process.env[env]}/docs/json`,
					pathPrefix: prefix
				});
			}
		};

		add("AUTH_SERVICE_URL", "auth", "/auth");
		add("USERS_SERVICE_URL", "users", "/users");
		add("NOTIFICATION_SERVICE_URL", "notification", "/notification");

		console.log(`📡 Discovered services: ${services.map(s => s.name).join(", ")}`);
		return (services);
	}

	async	getAggregatedSpec()
	{
		const	results = await Promise.all(
			this.services.map(async svc =>
			{
				try
				{
					const	res = await axios.get(svc.url,
					{
						timeout: 5000,
						headers: { "x-internal-api-key": process.env.INTERNAL_API_KEY }
					});

					return { ...svc, spec: res.data };
				}
				catch (err)
				{
					console.warn(`⚠️ Failed to load ${svc.name} docs: ${err.message}`);
					return (null);
				}
			})
		);

		const	specs = results.filter(Boolean);
		console.log(`📚 Loaded ${specs.length}/${this.services.length} specs`);

		return (this.mergeSpecs(specs));
	}

	mergeSpecs(specs)
	{
		const	base =
		{
			swagger: "2.0",
			info: {
				title: "ft_transcendence API Gateway",
				description: "Unified API documentation",
				version: "1.0.0"
			},
			paths: {},
			definitions: {},
			securityDefinitions:
			{
				cookieAuth:
				{
					type: "apiKey",
					in: "cookie",
					name: "access_token"
				},
				internalApiKey:
				{
					type: "apiKey",
					in: "header",
					name: "x-internal-api-key"
				}
			},
			tags: []
		};

		for (const { name, pathPrefix, spec } of specs)
		{
			const	tag = name[0].toUpperCase() + name.slice(1);

			base.tags.push({ name: tag, description: `${tag} service` });

			if (spec.paths)
			{
				for (const [path, methods] of Object.entries(spec.paths))
				{
					const	newPath = pathPrefix + path;
					base.paths[newPath] = {};

					for (const [method, op] of Object.entries(methods))
						base.paths[newPath][method] = { ...op, tags: [tag] };
				}
			}

			if (spec.definitions)
			{
				for (const [nameKey, schema] of Object.entries(spec.definitions))
					base.definitions[`${tag}${nameKey}`] = schema;
			}
		}

		return (base);
	}

	getFallbackSpec()
	{
		return (
		{
			swagger: "2.0",
			info: { title: "ft_transcendence API Gateway (Fallback)", version: "1.0.0" },
			paths: {}
		});
	}

	async	register(fastify)
	{
		// Load initial spec
		this.currentSpec = await this.getAggregatedSpec();

		// Protect docs with basic auth
		await fastify.register(fastifyBasicAuth,
		{
			validate: async (username, password) =>
			{
				if (username !== process.env.DOC_USERNAME || password !== process.env.DOC_PASSWORD)
					throw new Error("Unauthorized");
			},
			authenticate: { realm: "Swagger Docs" }
		});

		// Register Swagger (dynamic mode)
		await fastify.register(import("@fastify/swagger"),
		{
			mode: "static",
			specification: { document: this.currentSpec }
		});

		// Register Swagger UI with dynamic refresh
		await fastify.register(import("@fastify/swagger-ui"),
		{
			routePrefix: "/docs",
			uiConfig: { docExpansion: "list", deepLinking: true },
			transformSpecificationClone: true,
			transformSpecification: (swaggerObject) =>
			{
				// Refresh specs on every page load (fire and forget)
				console.log("🔄 Refreshing documentation on page load...");
				this.getAggregatedSpec().then(spec => { this.currentSpec = spec;}).catch(err => {
					console.error("❌ Failed to refresh specs:", err.message);});

				// Return current spec immediately (may be stale on first load)
				return (this.currentSpec);
			}
		});

		// Protect UI
		fastify.addHook("onRequest", fastify.basicAuth);

		console.log("📚 Swagger UI available at → /docs");
		console.log("🔄 Docs will auto-refresh on every page load");
	}
}

export default SwaggerAggregator;
