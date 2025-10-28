import {
	getUserRelationships,
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
		description: 'Get the relationships of the authenticated user.',

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

export function	relationshipsRoutes(fastify)
{
	fastify.get('/relationships', getUserRelationshipsOpts);
}
