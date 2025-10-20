import {
	getUsers,
} from './users_controllers.js';

import { validateInternalApiKey } from './users_help.js';

// User schema
const	User =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		name: { type: 'string' },
	},
}

const	getUsersOpts =
{
	schema:
	{
		description: 'Retrieve a list of all users',

		headers :
		{
			type: 'object',
			properties:
			{
				'x-internal-api-key': { type: 'string' },
				'x-user-data': { type: 'string' }, // The user data is extracted from the gateway JWTauthentication request
			},
			required: ['x-internal-api-key'],
		},

		response:
		{
			200:
			{
				type: 'array',
				items: User,
			},
		},
	},
	preHandler: validateInternalApiKey,
	handler: getUsers,
};


export function	userRoutes(fastify)
{
	// Get all users
	fastify.get('/', getUsersOpts);
}
