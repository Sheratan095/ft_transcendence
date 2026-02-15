import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './pong-ws-handlers.js';

import {
	createUserStats as createUserStatsHandler,
	deleteUserStats as deleteUserStatsHandler,
	getUserStats as getUserStatsHandler,
	getUserMatchHistory as getUserMatchHistoryHandler,
	createTournament as createTournamentHandler,
	getAllTournaments as getAllTournamentsHandler,
	joinTournament as joinTournamentHandler,
	isUserBusy as isUserBusyHandler,
	getUserTournamentsParticipations as getUserTournamentsParticipationsHandler,
	getTournamentBracket as getTournamentBracketHandler,
	testGetTournament as testGetTournamentHandler,
	removeWsConnection as removeWsConnection
} from './pong-controllers.js';

import { validateInternalApiKey } from './pong-help.js';

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

const	Match =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		playerLeftId: { type: 'string' },
		playerLeftUsername: { type: 'string' }, // TO DO check the controller
		playerRightId: { type: 'string' },
		playerRightUsername: { type: 'string' },
		status: { type: 'string' },
		winnerId: { type: 'string'},
		isBye : { type: 'boolean' }, // for tournament matches
		endedAt: { type: 'string', format: 'date-time' },
		tournamentId: { type: 'string' },
		playerLeftScore: { type: 'integer' },
		playerRightScore: { type: 'integer' }
	}
};

const	TournamentInfo =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		name: { type: 'string' },
		status: { type: 'string' },
		createdAt: { type: 'string', format: 'date-time' },
		creatorUsername: { type: 'string' },
		participantCount: { type: 'integer' }
	}
};

const	TournamentParticipant =
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' },
		username: { type: 'string' }
	}
};

const	TournamentParticipation =
{
	type: 'object',
	properties:
	{
		tournamentId: { type: 'string' },
		tournamentName: { type: 'string' },
		winnerUsername: { type: 'string' },
		endedAt: { type: 'string', format: 'date-time' },
		top: { type: 'integer' } // User's rank in the tournament
	}
};

const	TournamentRound =
{
	type: 'object',
	properties:
	{
		roundNumber: { type: 'integer' },
		matches:
		{
			type: 'array',
			items: Match
		}
	}
};

const	TournamentBracket =
{
	type: 'object',
	properties:
	{
		tournamentId: { type: 'string' },
		name: { type: 'string' },
		status: { type: 'string' },
		currentRound: { type: 'integer' },
		totalRounds: { type: 'integer' },
		participantCount: { type: 'integer' },
		winnerId : { type: 'string' },
		rounds:
		{
			type: 'array',
			items: TournamentRound
		}
	}
};

//-----------------------------INTERNAL ROUTES-----------------------------

const	createUserStats = 
{
	schema:
	{
		summary: '🔒 Internal - Create user stats',
		description: 'Internal only (called by auth service when a new user is created). Creates a new stats entry for the user.',
		tags: ['Internal'],

		...withInternalAuth,

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
			201:
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
	handler: createUserStatsHandler
}

const	deleteUserStats = 
{
	schema:
	{
		summary: '🔒 Internal - Delete user stats',
		description: 'Internal only (called by auth service when a user is deleted for GDPR compliance). Deletes the stats entry for the user.',
		tags: ['Internal'],

		...withInternalAuth,

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
			201:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: deleteUserStatsHandler
}

const	isUserBusy =
{
	schema:
	{
		summary: '🔒 Internal - Check if user is busy',
		description: 'Internal only. Checks if a user is currently in a game/tournament. (called by other game services before inviting/joining)',
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
				properties: { isBusy: { type: 'boolean' } }
			},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: isUserBusyHandler
}

const	removeWsConnectionOpts =
{
	schema:
	{
		summary: '🔒 Internal - Remove all WebSocket connections for a user (Called by auth service during logout/delete)',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['userId'],
			properties: { userId: { type: 'string' }, }
		},
		response:
		{
			200 : {},
			500: ErrorResponse
		},
	},

	preHandler: validateInternalApiKey,
	handler: removeWsConnection,
}

//-----------------------------PUBLIC ROUTES-----------------------------

const	getUserStats =
{
	schema:
	{
		summary: 'Get user stats',
		description: 'Retrieve the stats for a given user.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		querystring:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					gamesPlayed: { type: 'integer' },
					gamesWon: { type: 'integer' },
					gamesLost: { type: 'integer' },
					tournamentsWon: { type: 'integer' },
					tournamentsParticipated: { type: 'integer' },
					elo: { type: 'integer' },
					rank: { type: 'string' }
				}
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUserStatsHandler
}

const	getUserMatchHistory =
{
	schema:
	{
		summary: 'Get user match history',
		description: 'Retrieve the match history for a given user.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,
		querystring:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'array',
				items: Match
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUserMatchHistoryHandler
}

const	createTournament =
{
	schema:
	{
		summary: 'Create a new tournament',
		description: 'Create a new tournament with the given parameters.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['name'],
			properties:
			{
				name: { type: 'string' },
			}
		},

		response:
		{
			201:
			{
				type: 'object',
				properties:
				{
					tournamentId: { type: 'string' },
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler: createTournamentHandler
}

const	getAllTournaments =
{
	schema:
	{
		summary: 'Get all tournaments',
		description: 'Retrieve a list of all tournaments.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: TournamentInfo
			},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getAllTournamentsHandler
}

const	joinTournament =
{
	schema:
	{
		summary: 'Join a tournament',
		description: 'Join an existing tournament.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['tournamentId'],
			properties:
			{
				tournamentId: { type: 'string' }
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
					participants:
					{
						type: 'array',
						items: TournamentParticipant
					},
				}
			},
			400: ErrorResponse,
			404: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: joinTournamentHandler
}

const	getUserTournamentsParticipations =
{
	schema:
	{
		summary: 'Get user tournament participation',
		description: 'Retrieve the list of tournament participation for a given user.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		querystring:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'array',
				items: TournamentParticipation
			},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUserTournamentsParticipationsHandler
}

const	getTournamentBracket =
{
	schema:
	{
		summary: 'Get tournament bracket',
		description: 'Retrieve the full bracket state for a tournament (all rounds and matches), it works only for ongoing tournaments.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		params:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:{ ...TournamentBracket },
			404: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getTournamentBracketHandler
}

const	testGetTournament = 
{
	schema:
	{
		summary: 'Get tournament test bracket',
		tags: ['Test'],

		...withInternalAuth,

		response:
		{
			200: { ...TournamentBracket },
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: testGetTournamentHandler
}

//-----------------------------EXPORT ROUTES-----------------------------

export async function	pongRoutes(fastify, options)
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

	fastify.get('/stats', getUserStats);
	fastify.get('/history', getUserMatchHistory);
	fastify.get('/get-all-tournaments', getAllTournaments);
	fastify.get('/is-user-busy', isUserBusy);
	fastify.get('/user-tournaments-participations', getUserTournamentsParticipations);
	fastify.get('/tournaments/:id/bracket', getTournamentBracket);
	fastify.get('/tournaments/test', testGetTournament);

	fastify.post('/create-user-stats', createUserStats);
	fastify.post('/create-tournament', createTournament);
	fastify.post('/join-tournament', joinTournament);

	fastify.delete('/delete-user-stats', deleteUserStats);
	fastify.delete('/remove-ws-connection', removeWsConnectionOpts);
}
