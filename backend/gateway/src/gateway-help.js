import axios from 'axios'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Helper function to validate JWT token via auth service
// Returns user data if valid, throws error otherwise
async function	validateJwtTokenInternal(cookieHeader)
{
	const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/validate-token`,
		{}, // No body needed
		{
			headers: {
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
				cookie: cookieHeader
			},
			withCredentials: true
		}
	);

	if (response.data.valid)
		return (response.data.user);
	
	throw new Error('Invalid token');
}

// Authentication middleware that validates JWT tokens via auth service
// it's used as prehandler in http requests
// This function is called before protected routes to verify user authentication
export async function	authenticateJwt(request, reply)
{
	try
	{
		// Call auth service to validate the token with API key
		const	user = await validateJwtTokenInternal(request.headers.cookie);

		// If token is valid, attach user data to request object
		request.user = user;

		return ; // Continue to the route handler
	}
	catch (err)
	{
		// Forward auth service error messages if available
		if (err.response && err.response.data)
			return (reply.code(err.response.status).send(err.response.data))

		// Handle auth service unavailability or network errors
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

// WebSocket authentication - validates JWT token for WebSocket upgrade requests
// Returns user data if valid, throws error otherwise
export async function	authenticateJwtWebSocket(request)
{
	try
	{
		// Extract cookies from WebSocket upgrade request headers
		const	cookieHeader = request.headers.cookie;
		
		if (!cookieHeader)
			throw new Error('No cookies provided');

		// Validate token using the same auth service endpoint
		const	user = await validateJwtTokenInternal(cookieHeader);
		
		return (user);
	}
	catch (err)
	{
		// Rethrow with appropriate error message
		if (err.response && err.response.data)
			throw new Error(err.response.data.error || 'Unauthorized');

		throw new Error('Authentication failed');
	}
}

export function	checkEnvVariables(requiredEnvVars)
{
	let	missingEnvVarsCount = 0;

	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.error(`[GATEWAY] Missing required environment variable: ${envVar}`);
			missingEnvVarsCount++;
		}
	}

	if (missingEnvVarsCount > 0)
		process.exit(1);
}
