import {
	// token,
	logout,
	login,
	register,
	validateToken
} from './auth_controllers.js';

import { validateInternalApiKey } from './auth_help.js';

const	Tokens =
{
	type: 'object',
	properties:
	{
		accessToken: { type: 'string' },
		refreshToken: { type: 'string' },
	},
}

const	User = 
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		username: { type: 'string' },
		email: { type: 'string' },
	},
}

// Reusable error response schemas
const	ErrorResponse = 
{
	type: 'object',
	properties:
	{
		error: { type: 'string' }
	}
}

const	WelcomeResponse = 
{
	type: 'object',
	properties:
	{
		message: { type: 'string' },
		tokens: Tokens,
		user: User
	}
}

const	registerOpts = 
{
	schema: 
	{
		security: [{ internalApiKey: [] }],
		body: 
		{
			type: 'object',
			required: ['username', 'password', 'email'],
			properties: 
			{
				username: { type: 'string' },
				password: { type: 'string' },
				email: { type: 'string', format: 'email' }
			}
		},
		response:
		{
			201: WelcomeResponse,
			409: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: register
}

const	loginOpts = 
{
	schema: 
	{
		security: [{ internalApiKey: [] }],
		body: 
		{
			type: 'object',
			required: ['password'],
			properties: 
			{
				username: { type: 'string' },
				email: { type: 'string', format: 'email' },
				password: { type: 'string' }
			},
			anyOf: [
				{ required: ['username'] },
				{ required: ['email'] }
			]
		},
		response:
		{
			200: WelcomeResponse,
			400: ErrorResponse,
			401: ErrorResponse,
			409: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: login
}

const	logoutOpts =
{
	schema:
	{
		security: [{ internalApiKey: [] }],
		body:
		{
			type: 'object',
			required: ['refreshToken'],
			properties:
			{
				refreshToken: { type: 'string' }
			}
		},
		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: logout
}

const	validateTokenOpts =
{
	schema:
	{
		summary: '🔒 Internal',
		security: [{ internalApiKey: [] }],
		body:
		{
			type: 'object',
			required: ['token'],
			properties:
			{
				token: { type: 'string' }
			}
		},
		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' },
					userId: { type: 'string' },
					valid: { type: 'boolean' }
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			498: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: validateToken
};

export function	authRoutes(fastify)
{
	fastify.post('/register', registerOpts);
	fastify.post('/login', loginOpts);
	fastify.post('/validate-token', validateTokenOpts);
	fastify.delete('/logout', logoutOpts);
}
