import {
	token,
	logout,
	login,
	register,
	validateToken,
	verifyTwoFactorAuth,
	enable2FA,
	changePassword,
	getAccount,
	deleteAccount
} from './auth-controllers.js';

import { validateInternalApiKey } from './auth-help.js';

const	User = 
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		tfaEnabled: { type: 'boolean' },
		email: { type: 'string' },
	},
}

const	PasswordPolicy =
{
	type: 'string',
	pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+])[A-Za-z\\d!@#$%^&*()_+]{8,24}$',
		errorMessage: {
		pattern: 'Password must be 8–24 chars long and include upper, lower, number, and symbol.'
	}
};

const	EmailPolicy =
{
	type: 'string',
	format: 'email',
	maxLength: 254,
	errorMessage: {
		format: 'Invalid email format'
	}
}

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

const	WelcomeResponse = 
{
	type: 'object',
	properties:
	{
		message: { type: 'string' },
		user: User
	}
};

const	LoginResponse = 
{
	type: 'object',
	properties:
	{
		message: { type: 'string' },
		user: User,
		tfaRequired: { type: 'boolean' },
		userId: { type: 'string' }
	},
	additionalProperties: true
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

const	withCookieAuth =
{
	security: [{ cookieAuth: [] }],
};

// ------------------------------ROUTES WITHOUT JWT PROTECTION-----------------------------

const	registerOpts = 
{
	schema: 
	{
		description: 'Register a new user',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['username', 'email', 'password'],
			properties:
			{
				username: { type: 'string' },
				email: { ...EmailPolicy },
				password: { ...PasswordPolicy}
			}
		},

		response:
		{
			201: WelcomeResponse,
			400: ErrorResponse,
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
		description: 'Login an existing user',

		...withInternalAuth,

		body: 
		{
			type: 'object',
			required: ['password', 'email'],
			properties: 
			{
				email: { type: 'string', format: 'email' },
				password: { type: 'string' }
			}
		},

		response:
		{
			200: LoginResponse,
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
		description: 'Logout a user by invalidating their refresh token',

		...withInternalAuth,

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

const	tokenOpts =
{
	schema:
	{
		description: 'Generate a new access token using a refresh token',

		...withInternalAuth,
		...withCookieAuth, // Refresh token is here

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' },
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: token
};

const	twoFactorAuthOpts =
{
	schema:
	{
		description: 'Verify a user\'s Two-Factor Authentication (2FA) code',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['userId', 'otpCode'],
			properties:
			{
				userId: { type: 'string' },
				otpCode: { type: 'string' }
			}
		},

		response:
		{
			200: WelcomeResponse,
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: verifyTwoFactorAuth
}

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

// This is internal too
const	enable2FAOpts =
{
	schema:
	{
		description: 'Enable or disable Two-Factor Authentication (2FA) for a user',

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['tfaEnabled'],
			properties:
			{
				tfaEnabled: { type: 'boolean' }
			},	
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' },
					user: User
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			409: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: enable2FA
}

const	changePasswordOpts =
{
	schema:
	{
		description: 'Change user password. userId is added in JWT validation middleware.',

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['oldPassword', 'newPassword'],
			properties:
			{
				oldPassword: { type: 'string' },
				newPassword: { ...PasswordPolicy }
			}
		},

		response:
		{
			200:
			{
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: changePassword
};

const	deleteAccountOpts =
{
	schema:
	{
		description: 'Delete user account. userId is added in JWT validation middleware.',

		...withInternalAuth,
		...withCookieAuth,

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
	handler: deleteAccount
}

//-----------------------------INTERAL ROUTES-----------------------------


// TOKEN is passed in body since this route is called by other services (not browser)
const	validateTokenOpts =
{
	schema:
	{
		summary: '🔒 Internal',
		description: 'Validate an access token and retrieve the associated user ID',

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'object',
				properties: // The user data returned will be added to the request forwarded to the requested gateway
				{
					message: { type: 'string' },
					valid: { type: 'boolean' },
					user:
					{
						type: 'object',
						properties:
						{
							id: { type: 'string' },
							email: { type: 'string' }
						}
					}
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},
	preValidation: validateInternalApiKey,
	handler	: validateToken
};

const	getAccountOpts =
{
	schema:
	{
		summary: '🔒 Internal (called by user service to retrieve the email)',

		description: 'Get account details for the authenticated user',

		...withInternalAuth,

		querystring:
		{
			type: 'object',
			properties:
			{
				id: { type: 'string'}
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
					user: User
				}
			},
			400: ErrorResponse,
			401: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: getAccount
};


export function	authRoutes(fastify)
{
	fastify.get('/get-account', getAccountOpts);

	fastify.post('/register', registerOpts);
	fastify.post('/login', loginOpts);
	fastify.post('/validate-token', validateTokenOpts);
	fastify.post('/token', tokenOpts);
	fastify.post('/2fa', twoFactorAuthOpts);

	fastify.put('/enable-2fa', enable2FAOpts);
	fastify.put('/change-password', changePasswordOpts);

	fastify.delete('/logout', logoutOpts);
	fastify.delete('/delete-account', deleteAccountOpts);
}
