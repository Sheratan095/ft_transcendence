import axios from 'axios';

// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateInternalApiKey(request, reply)
{
	const	apiKey = request.headers['x-internal-api-key']
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
		console.log('Error parsing user data from headers:', err.message);
		return (null);
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

export async function	getAccount(userId)
{
	try
	{
		const	response = await axios.get(`${process.env.AUTH_SERVICE_URL}/get-account?id=${userId}`,
			{
				headers: {
					'x-internal-api-key': process.env.INTERNAL_API_KEY
				}
			}
		)

		return (response.data.user);

	}
	catch (error)
	{
		console.log('Error fetching account from auth service:', error.message);
		return (null);
	}

}
