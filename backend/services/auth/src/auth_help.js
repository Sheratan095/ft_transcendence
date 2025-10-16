import jwt from 'jsonwebtoken';

// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateInternalApiKey(request, reply)
{
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

export function	getExpirationDate(days)
{
	//												hours min sec  ms
	const	expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

	return (expiresAt);
}

export function	formatExpirationDate(date)
{
	const	expiresAtStr = date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

	return (expiresAtStr);
}

export async function	generateNewTokens(user, authDb)
{
	const	userPayload = { id: user.id, email: user.email };
	const	accessToken = generateAccessToken(userPayload);
	const	refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET);

	// Store refresh token in database with expiration
	const	expiresAt = getExpirationDate(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);

	await authDb.insertRefreshToken(user.id, refreshToken, expiresAt);

	return { accessToken, refreshToken };
}

export const	decodeToken = (token) =>
{
	return (jwt.verify(token, process.env.REFRESH_TOKEN_SECRET));
}