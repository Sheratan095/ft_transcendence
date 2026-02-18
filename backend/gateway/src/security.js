import helmet from "@fastify/helmet";
import cors from '@fastify/cors';
import xss from 'xss';
import { readFileSync } from 'fs';
import path from 'path';
import { exit } from 'process';

/**
 * Load and validate HTTPS certificates if USE_HTTPS is enabled.
 * @returns {Object|null} HTTPS options with key and cert, or null for HTTP
 */
export function	loadHttpsConfig()
{
	if (process.env.USE_HTTPS !== 'true')
		return null;

	try
	{
		const certsPath = process.env.HTTPS_CERTS_PATH;
		return {
			key: readFileSync(path.join(certsPath, 'key.pem')),
			cert: readFileSync(path.join(certsPath, 'cert.pem'))
		};
	}
	catch (err)
	{
		console.error('[GATEWAY] Failed to load HTTPS certificates:', err.message);
		console.error('[GATEWAY] Falling back to HTTP');
		exit(1);
	}
}

// Sanitize strings recursively to prevent XSS attacks; track if any value was modified so we can log when the
// "defender" activates without printing user-sensitive payloads.
const	sanitizeValue = (value, ctx = { activated: false, keys: [] }, path = '') =>
{
	if (typeof value === 'string')
	{
		const	sanitized = xss(value);
		if (sanitized !== value)
		{
			ctx.activated = true;
			ctx.keys.push(path || '<string>');
		}
		return (sanitized);
	}

	if (Array.isArray(value))
		return (value.map((v, i) => sanitizeValue(v, ctx, `${path}[${i}]`)));

	if (value && typeof value === 'object')
	{
		const	out = Array.isArray(value) ? [] : {};

		for (const k of Object.keys(value))
			out[k] = sanitizeValue(value[k], ctx, path ? `${path}.${k}` : k);

		return (out);
	}
	return (value);
};

/**
 * Register all security middleware and hooks for the gateway.
 * Includes: CORS, helmet (CSP headers), XSS sanitizer, and additional security headers.
 * @param {FastifyInstance} fastify - Fastify instance
 */
export async function registerSecurityMiddleware(fastify)
{
	// CORS: Allow requests from frontend URL and localhost (for development)
	await fastify.register(cors,
	{
		origin: (origin, cb) => {
			// Allow requests from frontend URL and file:// protocol (for testing)
			const	allowedOrigins = [
				process.env.FRONTEND_URL,
				'null', // file:// protocol shows as 'null'
			];
			
			// Allow any localhost origin for development
			if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin))
				cb(null, true);
			else
				cb(new Error('Not allowed by CORS'), false);
		},

		methods: ['GET', 'POST', 'PUT', 'DELETE'],
 		credentials: true // Allow cookies to be sent
	});

	// Helmet: collection of middleware functions for Node.js designed to
	// secure web applications by setting crucial HTTP headers
	fastify.register(helmet,
	{
		contentSecurityPolicy:
		{
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				objectSrc: ["'none'"],
				baseUri: ["'self'"],
				imgSrc: ["'self'", "data:", "blob:"], // Allow images from same origin, data URLs, and blob URLs
			},
		},
	});

	// Global request sanitizer to reduce XSS attack surface: sanitize any string
	// values in `body`, `query` and `params`. Skip multipart/form-data bodies.
	fastify.addHook('preHandler', async (request, reply) =>
	{
		const	ct = (request.headers['content-type'] || '').toLowerCase();
		if (ct.includes('multipart/form-data'))
			return; // file uploads - skip

		const	ctx = { activated: false, keys: [] };

		if (request.body && typeof request.body === 'object')
			request.body = sanitizeValue(request.body, ctx, 'body');
		if (request.query && typeof request.query === 'object')
			request.query = sanitizeValue(request.query, ctx, 'query');
		if (request.params && typeof request.params === 'object')
			request.params = sanitizeValue(request.params, ctx, 'params');

		if (ctx.activated)
		{
			const	client = request.ip || request.headers['x-forwarded-for'] || 'unknown';
			console.info(`[GATEWAY][DEFENDER] Sanitized ${ctx.keys.length} field(s) on ${request.method} ${request.url} from ${client}: ${ctx.keys.join(', ')}`);
		}
	});

	// Ensure additional safe response headers are always present
	fastify.addHook('onSend', async (request, reply, payload) =>
	{
		reply.header('X-Content-Type-Options', 'nosniff');
		reply.header('X-Frame-Options', 'DENY');
		reply.header('Referrer-Policy', 'no-referrer');

		return (payload);
	});
}
