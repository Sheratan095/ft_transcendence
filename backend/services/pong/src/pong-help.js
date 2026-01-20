import axios from 'axios';
import { gameManager } from './GameManager.js';
import { tournamentManager } from './TournamentManager.js';

// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateInternalApiKey(request, reply)
{
	const	key = request.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY)
	{
		console.error('[CHAT] Missing or invalid internal API key');
		return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing API key' });
	}
}

export function	checkEnvVariables(requiredEnvVars)
{
	let	missingEnvVarsCount = 0;

	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.error(`[CHAT] Missing required environment variable: ${envVar}`);
			missingEnvVarsCount++;
		}
	}

	if (missingEnvVarsCount > 0)
		process.exit(1);
}

// Helper function to extract user data from gateway headers
// This function parses the user data passed from the gateway after JWT authentication
export function	extractUserData(request)
{
	try
	{
		if (request.headers['x-user-data'])
			return (JSON.parse(request.headers['x-user-data']));

		return (null);
	}
	catch (err)
	{
		console.log('[CHAT] Error parsing user data from headers:', err.message);
		return (null);
	}
}

export function	sendGameInviteNotification(senderId, senderUsername, targetId, gameId)
{
	try
	{
		const	response = axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-game-invite`,
		{ senderId, senderUsername, targetId, gameId, "gameType":"pong" },
		{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		);
	}
	catch (err)
	{
		console.error('[PONG] Error sending game invite notification:', err.message);
	}
}

export async function	getUsernameById(userId)
{
	try
	{
		const	response = await fetch(`${process.env.USERS_SERVICE_URL}/user?id=${userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
		});

		if (!response.ok)
		{
			console.error(`[PONG] Failed to fetch user data for Id ${userId}: ${response.statusText}`);
			return (null);
		}

		const	userData = await response.json();
		return (userData.username);
	}
	catch (error)
	{
		console.error(`[PONG] Error fetching user data for Id ${userId}:`, error.message);
		return (null);
	}
}

export function	calculateElo(win, loss)
{
	let	elo = (process.env.EARNED_WIN_POINTS * win) - (process.env.LOST_LOSS_POINTS * loss);

	if (elo < 0)
		elo = 0;

	let	rank;

	if (elo < 200)
		rank = 'Noob';
	else if (elo >= 200 && elo <= 399)
		rank = 'Beginner';
	else if (elo >= 400 && elo <= 599)
		rank = 'Intermediate';
	else if (elo >= 600 && elo <= 899)
		rank = 'Pro';
	else if (elo >= 900 )
		rank = 'Master';

	return ({ elo, rank });
}

export function	sleep(ms)
{
	return (new Promise(resolve => setTimeout(resolve, ms)));
}

export async function	checkBlock(userA, userB)
{
	try
	{
		const	response = await fetch(`${process.env.USERS_SERVICE_URL}/relationships/check-block?userA=${userA}&userB=${userB}`,
		{
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
		});

		if (!response.ok)
		{
			console.error(`[CHAT] Failed to check block status between ${userA} and ${userB}: ${response.statusText}`);
			return (false);
		}

		const	data = await response.json();
		return (data.isBlocked);
	}
	catch (err)
	{
		console.error('[CHAT] Error checking block status:', err.message);
		return (false);
	}
}

export async function	isUserBusyInternal(userId, includeTris)
{
	const	isInGame = await gameManager.isUserInGameOrMatchmaking(userId);
	const	isInTournament = await tournamentManager.isUserInTournament(userId);

	let	status = isInGame || isInTournament;

	// If specified, check Tris service for busy status
	//	it's included when the request comes from this service, when it's from another service we assume they already checked Tris
	if (includeTris)
	{
		try
		{
			const	response = await axios.get(`${process.env.TRIS_SERVICE_URL}/is-user-busy`, {
				params: { userId }
			});

			status = status || response.data.isBusy;

			console.log(`[PONG] User ${userId} busy status ${status},[TRIS included]`);

			return (status);
		}
		catch (err)
		{
			console.error(`[PONG] Failed to check user busy status in Tris service for Id ${userId}:`, err.message);
			return (status);
		}
	}

	console.log(`[PONG] User ${userId} busy status ${status}`);

	return (status);
}