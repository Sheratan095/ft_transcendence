import {
	getUsers,
	getUser,
	createUser,
	updateUser,
	uploadAvatar,
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
		language: { type: 'string' },
		avatarUrl: { type: 'string' },
	},
};

// Reusable error response schemas
const	ErrorResponse =
{
	type: 'object',
	properties:
	{
		statusCode: { type: 'integer' },
		code: { type: 'string' },
		error: { type: 'string' },
		message: { type: 'string' }
	},
	additionalProperties: true // let Fastify include unexpected fields
};

const	UsernamePolicy = 
{
	type: 'string',
	pattern: '^[a-zA-Z][a-zA-Z0-9._]{2,19}$',
	errorMessage: {
		pattern: 'Username must start with a letter and be 3–20 characters long, only letters, numbers, dots, or underscores allowed. (Username will be stored in lowercase)'
	}
};

const	SupportedLanguages =
{
	type: 'string',
	enum: ['en', 'fr', 'it'], // Example supported languages
	errorMessage: {
		enum: 'Language must be one of the supported languages: en, fr, it.'
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
			required: ['username', 'userId'],
			properties:
			{
				username: { ...UsernamePolicy },
				userId: { type: 'string' }
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
		description: 'Get a user - supports query params: ?username=value or ?id=value',

		...withInternalAuth,

		querystring:
		{
			type: 'object',
			properties:
			{
				username: { type: 'string' },
				id: { type: 'string' }
			}
		},

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

// The userId isn't needed in the body as it's extracted from the JWT token
const	updateUserOpts =
{
	schema:
	{
		description: 'Update user details',

		...withInternalAuth,

		body:
		{
			type: 'object',
			properties:
			{
				newUsername: { ...UsernamePolicy },
				newLanguage: { ...SupportedLanguages }
			},
			anyOf:
			[
				{ required: ['newUsername'] },
				{ required: ['newLanguage'] }
			]
		},
		response:
		{
			200: User,
			400: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler: updateUser,
}

const	uploadAvatarOpts =
{
	schema:
	{
		description: 'Upload or update user avatar',

		...withInternalAuth,

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' },
					avatarUrl: { type: 'string' }
				}
			},
			400: ErrorResponse,
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler: uploadAvatar,
};


export function	userRoutes(fastify)
{
	fastify.get('/', getUsersOpts);
	
	// Versatile GET route - handles single user queries by username or id
	fastify.get('/user', getUserOpts);

	fastify.post('/new-user', newUserOpts);
	fastify.post('/upload-avatar', uploadAvatarOpts);

	fastify.put('/update-user', updateUserOpts);
}
