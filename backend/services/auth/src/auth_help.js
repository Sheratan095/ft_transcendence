import jwt from 'jsonwebtoken';

// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateApiKey(request, reply)
{
	console.log('Register request received in auth:', request.headers)

	const	apiKey = request.headers['x-api-key']
	const	expectedApiKey = process.env.INTERNAL_API_KEY
	
	if (!apiKey || apiKey !== expectedApiKey)
	{
		return (reply.code(401).send(
		{
			error: 'Unauthorized: Invalid or missing API key',
			message: 'This service only accepts requests from authorized services'
		}))
	}
}

export function	generateAccessToken(user)
{
	return (jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15s' }))
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