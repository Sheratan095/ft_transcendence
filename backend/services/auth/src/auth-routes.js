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
		email: { type: 'string' },
		tfaEnabled: { type: 'boolean' },
	},
}

const	TokensResponse =
{
	headers:
	{
		type: 'object',
		properties:
		{
			'Set-Cookie':
			{
				type: 'string',
				description: 'HTTP-only cookies containing accessToken and refreshToken'
			}
		}
	}
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
	...TokensResponse,
	type: 'object',
	properties:
	{
		message: { type: 'string' },
		user: User
	}
};

const	LoginResponse = 
{
	...TokensResponse,
	type: 'object',
	properties:
	{
		message: { type: 'string' },
		user: User,
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

// ------------------------------ROUTES WITHOUT JWT PROTECTION-----------------------------

const	registerOpts = 
{
	schema: 
	{
		summary: 'Register new user',
		description: 'Register a new user. Returns accessToken and refreshToken as HTTP-only cookies.',
		tags: ['Authentication'],

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
		summary: 'Login user',
		description: 'Login an existing user. If 2FA is not enabled, returns accessToken and refreshToken as HTTP-only cookies. If 2FA is enabled, returns tfaRequired=true without tokens.',
		tags: ['Authentication'],

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
		summary: 'Logout user',
		description: 'Logout a user by invalidating their refresh token. Clears authentication cookies.',
		tags: ['Authentication'],

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
	handler: logout
}

const	tokenOpts =
{
	schema:
	{
		summary: 'Refresh access token',
		description: 'Generate a new access token using a refresh token. Requires refreshToken cookie. Returns new accessToken cookie.',
		tags: ['Authentication'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				...TokensResponse,
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
		summary: 'Verify 2FA code',
		description: 'Verify a user\'s Two-Factor Authentication (2FA) code. Returns accessToken and refreshToken as HTTP-only cookies upon successful verification.',
		tags: ['Authentication', '2FA'],

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
		summary: 'Enable/Disable 2FA',
		description: 'Enable or disable Two-Factor Authentication (2FA) for a user. Requires accessToken cookie for authentication.',
		tags: ['Authentication', '2FA'],

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
		summary: 'Change password',
		description: 'Change user password. Requires accessToken cookie for authentication. userId is extracted from the JWT.',
		tags: ['Account Management'],

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
		summary: 'Delete account',
		description: 'Delete user account. Requires accessToken cookie for authentication. userId is extracted from the JWT.',
		tags: ['Account Management'],

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
		summary: '🔒 Internal - Validate token',
		description: 'Internal only (called by gateway to validate session). Validates an access token and retrieves the associated user. Requires accessToken cookie.',
		tags: ['Internal'],

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
		summary: '🔒 Internal - Get account',
		description: 'Internal only (called by user service to retrieve account details). No authentication tokens required - uses internal API key only.',
		tags: ['Internal'],

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
