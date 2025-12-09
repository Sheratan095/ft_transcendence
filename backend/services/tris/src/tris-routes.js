import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './event-handlers.js';

// importing handlers
import {
	initBoard,
} from './tris-controllers.js';

import { validateInternalApiKey } from './tris-help.js';

// -------------- STRUCTURES ---------------------//

//////////////////////////
// declaring an Enum type
//////////////////////////
const	cellType = {
	type: 'string',
	enum: ['X', 'O', 'empty'],
}

///////////////////////
// declaring an Object
///////////////////////

// declaring Array
const	board = {
	type: 'array',
	items: cellType,
	minItems: 9,
	maxItems: 9,
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


// -------------- PUBLIC ROUTES ---------------------//


// fastify route configuration object
const createGameBoard = 
{
	schema:
	{
		// shows description of the method on swagger
		summary: 'Create the game board',
		tags: ['Tris'],

		...withCookieAuth,
		...withInternalAuth,

		response:
		{
			200: board,
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: initBoard
}

export function	trisRoutes(fastify)
{
	// Actual WebSocket endpoint
	fastify.get('/ws', { websocket: true }, (socket, req) =>
	{
		// if the request is invalid, reject it
		let	userId = handleNewConnection(socket, req);
		if (!userId)
			return ;

		socket.on('message', msg => {handleMessage(socket, msg, userId);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err, userId);});
	});

	fastify.get('/init', createGameBoard);
}
