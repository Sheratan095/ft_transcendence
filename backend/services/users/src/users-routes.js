import {
	getUsers,
	searchUser,
	getUser,
	createUser,
	updateUser,
	uploadAvatar,
	deleteUser,
	getUsersStats,
	getUsernameById
} from './users-controllers.js';

import { validateInternalApiKey } from './users-help.js';

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
		email: { type: 'string' },
		createdAt: { type: 'string', format: 'date-time' },
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
			'x-internal-api-key': 
			{ 
				type: 'string',
				description: 'Internal API key for service-to-service authentication'
			}
		}
	}
};

const	withCookieAuth =
{
	security: [{ cookieAuth: [] }],
	
	headers:
	{
		type: 'object',
		properties:
		{
			'accessToken':
			{
				type: 'string',
			},
			'refreshToken':
			{
				type: 'string',
			}
		}
	}
};

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

const	getUsersOpts =
{
	schema:
	{
		summary: 'Get all users',
		description: 'Retrieve a list of all users. Requires accessToken cookie for authentication.',
		tags: ['Users'],

		...withInternalAuth,
		...withCookieAuth,

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

const	getUserOpts =
{
	schema:
	{
		summary: 'Get single user',
		description: 'Get a user by username or id. Supports query params: ?username=value or ?id=value. Requires accessToken cookie for authentication.',
		tags: ['Users'],

		...withInternalAuth,
		...withCookieAuth,

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
			404: ErrorResponse,
			400: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUser,
};

const	searchUserOpts = 
{
	schema:
	{
		summary: 'Search users',
		description: 'Search users by username substring. Requires accessToken cookie for authentication.',
		tags: ['Users'],

		...withInternalAuth,
		...withCookieAuth,
		querystring:
		{
			type: 'object',
			required: ['q'],
			properties:
			{
				q: { type: 'string', description: 'Substring to search in usernames' }
			}
		},

		response:
		{
			200:
			{
				type: 'array',
				items: User,
			},
			400: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: searchUser,
}

const	updateUserOpts =
{
	schema:
	{
		summary: 'Update user',
		description: 'Update user details (username and/or language). Requires accessToken cookie for authentication. User is identified from JWT.',
		tags: ['Users'],

		...withInternalAuth,
		...withCookieAuth,

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
		summary: 'Upload avatar',
		description: 'Upload or update user avatar image. Requires accessToken cookie for authentication. Accepts multipart/form-data with image file.',
		tags: ['Users'],

		...withInternalAuth,
		...withCookieAuth,

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

const	getUsersStatsOpts =
{
	schema:
	{
		summary: 'Get user statistics (total users and active users), NO AUTHENTICATION REQUIRED',
		tags: ['Users'],

		// Without cookie auth, because it's requestable by every one

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					totalUsers: { type: 'integer' },
					activeUsers: { type: 'integer' }
				}
			},
			500: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUsersStats,
};
//-----------------------------INTERAL ROUTES-----------------------------

const	newUserOpts =
{
	schema:
	{
		summary: '🔒 Internal - Create user',
		description: 'Internal only (called by auth service during registration). Creates a new user profile. No authentication tokens required - uses internal API key only.',
		tags: ['Internal'],

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
		},

		response:
		{
			201: User,
			500: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: createUser,
}

const	deleteUserOpts =
{
	schema:
	{
		summary: '🔒 Internal - Delete user',
		description: 'Internal only (called by auth service during account deletion). Deletes a user profile and all related data. Requires accessToken cookie for authentication.',
		tags: ['Internal'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['userId'],
			properties:
			{
				userId: { type: 'string' }
			}
		},

		response:
		{
			200: { type: 'object', properties: { message: { type: 'string' } } },
			404: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: deleteUser,
}

const	getUsernameByIdOpts =
{
	schema:
	{
		summary: '🔒 Internal - Get username by user ID',
		description: 'Internal only. Retrieves the username for a given user ID. Requires internal API key for authentication.',
		tags: ['Internal'],

		...withInternalAuth,

		querystring:
		{
			type: 'object',
			required: ['userId'],
			properties: { userId: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{ username: { type: 'string' } }
			},
			404: ErrorResponse,
			500: ErrorResponse,
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUsernameById,
}

export function	userRoutes(fastify)
{
	fastify.get('/', getUsersOpts);
	
	// Versatile GET route - handles single user queries by username or id
	fastify.get('/user', getUserOpts);
	fastify.get('/search', searchUserOpts);
	fastify.get('/stats', getUsersStatsOpts);

	fastify.get('/username-by-id', getUsernameByIdOpts);

	fastify.post('/new-user', newUserOpts);
	fastify.post('/upload-avatar', uploadAvatarOpts);

	fastify.put('/update-user', updateUserOpts);

	fastify.delete('/delete-user', deleteUserOpts);
}
