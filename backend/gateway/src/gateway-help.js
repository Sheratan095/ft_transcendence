import axios from 'axios'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Authentication middleware that validates JWT tokens via auth service
// This function is called before protected routes to verify user authentication
export async function	authenticateJwtToken(request, reply)
{
	// Get token from cookies
	const	token = request.cookies && request.cookies.accessToken;

	// Return 401 if no token provided
	if (token == null)
		return (reply.code(401).send({ error: 'Authorization header required' }))

	try
	{
		// Call auth service to validate the token with API key
		const	response = await axios.post(`${process.env.AUTH_SERVICE_URL}/validate-token`, 
			{token: token},
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		// If token is valid, attach user data to request object
		if (response.data.valid)
			request.user = response.data.user

	}
	catch (err)
	{
		// Log authentication errors for debugging
		console.log('Auth service error:', err.message)

		// Forward auth service error messages if available
		if (err.response && err.response.data)
			return (reply.code(err.response.status).send(err.response.data))

		// Handle auth service unavailability or network errors
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export function	checkEnvVariables(requiredEnvVars)
{
	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.error(`Missing required environment variable: ${envVar}`);
			process.exit(1);
		}
	}
}