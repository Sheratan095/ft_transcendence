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
