// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateInternalApiKey(request, socket)
{
	const	apiKey = request.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY)
	{
		console.log('[NOTIFICATION] Missing or invalid internal API key');
		console.log('[NOTIFICATION] Expected key:', process.env.INTERNAL_API_KEY ? 'SET' : 'NOT SET');
		console.log('[NOTIFICATION] Received key:', apiKey ? 'PROVIDED' : 'MISSING');

		// For WebSocket connections, socket is already upgraded - just close it
		if (socket)
		{
			try { socket.close(1008, 'Unauthorized'); } catch (e) {}
		}

		return (false);
	}

	return (true);
}

export function	checkEnvVariables(requiredEnvVars)
{
	let	missingEnvVarsCount = 0;

	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.log(`Missing required environment variable: ${envVar}`);
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
		console.log('[NOTIFICATION] Error parsing user data from headers:', err.message);
		return (null);
	}
}
