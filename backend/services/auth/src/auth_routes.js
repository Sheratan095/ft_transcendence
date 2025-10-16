import {
	// token,
	logout,
	login,
	register,
	validateToken
} from './auth_controllers.js';

import { validateInternalApiKey } from './auth_help.js';

const	registerOpts = 
{
	schema: 
	{
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
		}
	},
	preHandler: validateInternalApiKey,
	handler: register
}

const	loginOpts = 
{
	schema: 
	{
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
		}
	},
	preHandler: validateInternalApiKey,
	handler: login
}

const	logoutOpts =
{
	schema:
	{
		body:
		{
			type: 'object',
			required: ['refreshToken'],
			properties:
			{
				refreshToken: { type: 'string' }
			}
		}
	},
	preHandler: validateInternalApiKey,
	handler: logout
}

const	validateTokenOpts =
{
	schema:
	{
		body:
		{
			type: 'object',
			required: ['token'],
			properties:
			{
				token: { type: 'string' }
			}
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
