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