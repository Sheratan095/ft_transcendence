import {
	getUsers,
	getUser,
	createUser
} from './users_controllers.js';

import { validateInternalApiKey } from './users_help.js';

// User schema
const	User =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		username: { type: 'string' },
	},
}

const	UsernamePolicy = 
{
	type: 'string',
	pattern: '^[a-zA-Z][a-zA-Z0-9._]{2,19}$',
	errorMessage: {
		pattern: 'Username must start with a letter and be 3–20 characters long, only letters, numbers, dots, or underscores allowed.'
	}
};

const	withInternalAuth =
{
	security: [{ internalApiKey: [] }],

	headers:
	{
		type: 'object',
		required: ['x-internal-api-key'],
		properties:
		{
			'x-internal-api-key': { type: 'string' }
		}
  }
};

const	getUsersOpts =
{
	schema:
	{
		description: 'Retrieve a list of all users',

		...withInternalAuth,

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

const	newUserOpts =
{
	schema:
	{
		summary: 'Internal only 🔒 (called by user auth service during registration)',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['Username', 'UserId'],
			properties:
			{
				Username: { ...UsernamePolicy },
				UserId: { type: 'string' }
			}
		}
	},
	preHandler: validateInternalApiKey,
	handler: createUser,
}

const	getUserOpts =
{
	schema:
	{
		description: 'Get a user by username',

		...withInternalAuth,

		response:
		{
			200: User,
			404:
			{
				type: 'object',
				properties:
				{
					error: { type: 'string' }
				}
			}
		}
	},
	preHandler: validateInternalApiKey,
	handler: getUser,
};

// TO DO the update route has to be done with username policy

export function	userRoutes(fastify)
{
	// Get all users
	fastify.get('/', getUsersOpts);
	fastify.get('/:username', getUserOpts);

	fastify.post('/new-user', newUserOpts);
}
