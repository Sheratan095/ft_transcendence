import axios from "axios";
import fastifyBasicAuth from "@fastify/basic-auth";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
		add("CHAT_SERVICE_URL", "chat", "/chat");
		add("PONG_SERVICE_URL", "pong", "/pong");
		add("TRIS_SERVICE_URL", "tris", "/tris");

		console.log(`[GATEWAY] 📡 Discovered services: ${services.map(s => s.name).join(", ")}`);
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
		console.log(`[GATEWAY] 📚 Loaded ${specs.length}/${this.services.length} specs`);

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
				// Don't needed since all the calls are done on gateway andpoint
				//	and swagger UI can't make call direclty to microservices
				// internalApiKey:
				// {
				// 	type: "apiKey",
				// 	in: "header",
				// 	name: "x-internal-api-key"
				// }
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
		// Load initial spec with retries in case services are not ready yet
		let attempts = 0;
		const maxAttempts = 12; // total wait ~12s (with 1s sleep)
		let spec = null;
		while (attempts < maxAttempts) {
			try {
				spec = await this.getAggregatedSpec();
				if (spec && Object.keys(spec.paths || {}).length > 0) break; // got useful spec
			} catch (err) {
				console.warn(`[GATEWAY] Retry ${attempts + 1}/${maxAttempts} - failed to load specs: ${err.message}`);
			}
			attempts += 1;
			// small delay before next attempt
			await new Promise(r => setTimeout(r, 1000));
		}
		this.currentSpec = spec || this.getFallbackSpec();

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

		// Register Swagger UI with dynamic refresh and protect it with basic auth
		// Use arrow function so `this` inside transformSpecification refers to the
		// SwaggerAggregator instance. If a normal function is used, `this` will
		// be undefined (strict mode) and calls like `this.getAggregatedSpec()`
		// will fail with "Cannot read properties of undefined".
		await fastify.register(async (fastifyInstance) =>
		{
			// Apply basic auth only to this scope (docs routes)
			fastifyInstance.addHook("onRequest", fastify.basicAuth);

			const darkCss = readFileSync(join(__dirname, 'dark.css'), 'utf-8');

			await fastifyInstance.register(import("@fastify/swagger-ui"),
			{
				routePrefix: "/docs",
				uiConfig: { docExpansion: "list", deepLinking: true },
				theme: {
					title: "ft_transcendence API",
					css: [
						{
							filename: "dark.css",
							content: darkCss
						}
					]
				},
				transformSpecificationClone: true,
				transformSpecification: (swaggerObject) =>
				{
					// Refresh specs on every page load (fire and forget)
					console.log("[GATEWAY] 🔄 Refreshing documentation on page load...");
					this.getAggregatedSpec().then(spec => { this.currentSpec = spec; }).catch(err => {
						console.error("[GATEWAY] ❌ Failed to refresh specs:", err.message);
					});

					// Return current spec immediately (may be stale on first load)
					return (this.currentSpec);
				}
			});
		});

		console.log("[GATEWAY] 📚 Swagger UI available at → /docs");
		console.log("[GATEWAY] 🔄 Docs will auto-refresh on every page load");
	}
}

export default SwaggerAggregator;
