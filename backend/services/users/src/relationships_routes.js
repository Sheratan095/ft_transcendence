import {
	getUserRelationships,
	getFriends,
	getIncomingRequests,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	blockUser,
	unblockUser,
	removeFriend
} from './relationships_controllers.js';

import { validateInternalApiKey } from './users_help.js';

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

const	RelationshipsStatus =
{
	type: 'string',
	enum: ['pending', 'accepted', 'rejected', 'blocked'],
	errorMessage: {
		enum: 'The relationship_status must be one of: pending, accepted, rejected, blocked.'
	}
};


const	UserRelationship =
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' },
		username: { type: 'string' },
		relationship_status: { ...RelationshipsStatus },
		created_at: { type: 'string', format: 'date-time' },
		updated_at: { type: 'string', format: 'date-time' }
	},
};

const	Friend =
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' },
		username: { type: 'string' },
		language: { type: 'string' },
		friends_since: { type: 'string', format: 'date-time' }
	},
};

const	IncomingRequest =
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' },
		username: { type: 'string' },
		created_at: { type: 'string', format: 'date-time' }
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


const	getUserRelationshipsOpts =
{
	schema:
	{
		description: 'Get all relationships of the authenticated user.',

		...withInternalAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: UserRelationship
			},
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getUserRelationships
};

const	getFriendsOpts =
{
	schema:
	{
		description: 'Get only accepted friends of the authenticated user.',

		...withInternalAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: Friend
			},
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getFriends
};

const	getIncomingRequestsOpts =
{
	schema:
	{
		description: 'Get incoming friend requests for the authenticated user.',

		...withInternalAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: IncomingRequest
			},
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getIncomingRequests
};

const	sendFriendRequestOpts =
{
	schema:
	{
		description: 'Send a friend request to another user.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['friendId'],
			properties:
			{
				friendId: { type: 'string' }
			}
		},

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
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: sendFriendRequest
};

const	acceptFriendRequestOpts =
{
	schema:
	{
		description: 'Accept a friend request from another user.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['friendId'],
			properties:
			{
				friendId: { type: 'string' }
			}
		},

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
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: acceptFriendRequest
};

const	rejectFriendRequestOpts =
{
	schema:
	{
		description: 'Reject a friend request from another user.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['friendId'],
			properties:
			{
				friendId: { type: 'string' }
			}
		},

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
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: rejectFriendRequest
};

const	blockUserOpts =
{
	schema:
	{
		description: 'Block another user.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['blockedId'],
			properties:
			{
				blockedId: { type: 'string' }
			}
		},

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
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: blockUser
};

const	unblockUserOpts =
{
	schema:
	{
		description: 'Unblock a previously blocked user.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['blockedId'],
			properties:
			{
				blockedId: { type: 'string' }
			}
		},

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
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: unblockUser
};

const	removeFriendOpts =
{
	schema:
	{
		description: 'Remove a friend or cancel a friend request.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['friendId'],
			properties:
			{
				friendId: { type: 'string' }
			}
		},

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
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: removeFriend
};

export function	relationshipsRoutes(fastify)
{
	// GET routes
	fastify.get('/relationships', getUserRelationshipsOpts);
	fastify.get('/relationships/friends', getFriendsOpts);
	fastify.get('/relationships/requests', getIncomingRequestsOpts);
	
	// POST routes
	fastify.post('/relationships/request', sendFriendRequestOpts);
	
	// PUT routes
	fastify.put('/relationships/accept', acceptFriendRequestOpts);
	fastify.put('/relationships/reject', rejectFriendRequestOpts);
	fastify.put('/relationships/block', blockUserOpts);
	
	// DELETE routes
	fastify.delete('/relationships/unblock', unblockUserOpts);
	fastify.delete('/relationships/remove', removeFriendOpts);
}
