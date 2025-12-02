import { chatConnectionManager } from './ChatConnectionManager.js';

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
			console.error(`[CHAT] Failed to fetch user data for Id ${userId}: ${response.statusText}`);
			return (null);
		}

		const	userData = await response.json();
		return (userData.username);
	}
	catch (error)
	{
		console.error(`[CHAT] Error fetching user data for Id ${userId}:`, error.message);
		return (null);
	}
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

// Helper to notify message senders about status updates (delivered/read)
export async function	notifyMessageStatusUpdates(roomId, updatedTime, chatDb)
{
	try
	{
		// Get all messages just updated at the given time (when they were marked delivered/read)
		const	justUpdatedMessages = await chatDb.getMessagesUpdatedAt(roomId, updatedTime);

		for (const { message_id, sender_id } of justUpdatedMessages)
		{
			// Notify sender about the overall status of the message
			const	overallStatus = await chatDb.getOverallMessageStatus(message_id);
			chatConnectionManager.notifyMessageStatusUpdate(sender_id, roomId, message_id, overallStatus);
		}
	}
	catch (err)
	{
		console.error('[CHAT] Error notifying message status updates:', err.message);
	}
}

export async function	notifyUserAddedToChat(toUserId, senderId, senderUsername, chatId)
{
	try
	{
		const	response = await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/notification/send-chat-user-added`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
			body: JSON.stringify({
				from: senderUsername,
				senderId: senderId,
				targetId: toUserId,
				chatId: chatId,
			}),
		});
	}
	catch (err)
	{
		console.error(`[CHAT] Error notifying user ${toUserId} about being added to chat ${chatId}:`, err.message);
	}
}