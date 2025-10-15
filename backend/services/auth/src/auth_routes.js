import {
	// token,
	// logout,
	login,
	register,
	// validateToken
} from './auth_controllers.js';

import { validateInternalApiKey } from './auth_help.js';

const	registerOpts = 
{
	schema: 
	{
		body: 
		{
			type: 'object',
			required: ['username', 'password'],
			properties: 
			{
				username: { type: 'string' },
				password: { type: 'string' }
			}
		}
	},
	preHandler: validateInternalApiKey,
	handler: register
}

const loginOpts = 
{
	schema: 
	{
		body: 
		{
			type: 'object',
			required: ['username', 'password'],
			properties: 
			{
				username: { type: 'string' },
				password: { type: 'string' }
			}
		}
	},
	preHandler: validateInternalApiKey,
	handler: login
}

export function authRoutes(fastify, authDatabase)
{
	fastify.post('/register', registerOpts);
	fastify.post('/login', loginOpts);
}