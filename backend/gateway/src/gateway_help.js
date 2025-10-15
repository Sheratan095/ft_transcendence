import axios from 'axios'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

// Authentication middleware that validates JWT tokens via auth service
// This function is called before protected routes to verify user authentication
export async function	authenticateToken(request, reply)
{
	// Extract Authorization header and parse Bearer token
	const	authHeader = request.headers['authorization']
	const	token = authHeader && authHeader.split(' ')[1]
	
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
					'x-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		// If token is valid, attach user data to request object
		if (response.data.valid)
			request.user = response.data.user
		else
			return (reply.code(403).send({ error: 'Invalid token' }))

	}
	catch (err)
	{
		// Log authentication errors for debugging
		console.log('Auth service error:', err.message)

		// Handle specific auth service responses
		if (err.response && err.response.status === 403)
			return (reply.code(403).send({ error: 'Invalid token' }))

		// Handle auth service unavailability or network errors
		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}