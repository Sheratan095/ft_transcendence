import {
	getUserRelationships,
	getFriends,
	getIncomingRequests,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	blockUser,
	unblockUser,
	cancelFriendRequest,
	removeFriend
} from './relationships-controllers.js';

import { validateInternalApiKey } from './users-help.js';

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
		requester_id: { type: 'string' },
		target_id: { type: 'string' },
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
		userId: { type: 'string' }, // still returned as userId for frontend
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
		requester_id: { type: 'string' },
		username: { type: 'string' },
		created_at: { type: 'string', format: 'date-time' }
	},
};

//----------------------------------Schema definitions----------------------------------

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
			400: ErrorResponse,
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
			400: ErrorResponse,
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
			400: ErrorResponse,
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
			required: ['target_id'],
			properties:
			{
				target_id: { type: 'string' }
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
			required: ['requester_id'],
			properties:
			{
				requester_id: { type: 'string' }
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
			required: ['requester_id'],
			properties:
			{
				requester_id: { type: 'string' }
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
			required: ['target_id'],
			properties:
			{
				target_id: { type: 'string' }
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
			required: ['target_id'],
			properties:
			{
				target_id: { type: 'string' }
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
	handler	: unblockUser
};

const	cancelFriendRequestOpts =
{
	schema:
	{
		description: 'Cancel an outgoing friend request.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['target_id'],
			properties:
			{
				target_id: { type: 'string' }
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
	handler	: cancelFriendRequest
}

const	removeFriendOpts =
{
	schema:
	{
		description: 'Remove a friend or cancel a friend request.',

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['target_id'],
			properties:
			{
				target_id: { type: 'string' }
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
	fastify.delete('/relationships/removeFriend', removeFriendOpts);
	fastify.delete('/relationships/cancelFriendRequest', cancelFriendRequestOpts);
}
