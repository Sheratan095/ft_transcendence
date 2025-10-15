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

// TO DO make username or email
const loginOpts = 
{
	schema: 
	{
		body: 
		{
			type: 'object',
			required: ['username', 'password' || 'email'],
			properties: 
			{
				username: { type: 'string' },
				email: { type: 'string', format: 'email' },
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