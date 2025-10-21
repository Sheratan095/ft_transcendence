import jwt from 'jsonwebtoken';

//inter-service communication
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
		{
			return (JSON.parse(request.headers['x-user-data']));
		}
		return (null);
	}
	catch (err) 
	{
		console.log('Error parsing user data from headers:', err.message);
	
		return (null);
	}
}

export function	generateAccessToken(user)
{
	return (jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION}));
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
	
	// Calculate expiration date
	const	expiration = getExpirationDate(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);
	
	// Generate refresh token WITH expiration
	const	refreshToken = jwt.sign(
		userPayload, 
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: `${process.env.REFRESH_TOKEN_EXPIRATION_DAYS}d` }
	);

	// Check if user already has a refresh token
	const	existingToken = await authDb.getRefreshTokenByUserId(user.id);
	
	if (existingToken) // Update existing token (token rotation)
		await authDb.updateRefreshToken(user.id, refreshToken, expiration);
	else	// Insert new token (first time login)
		await authDb.insertRefreshToken(user.id, refreshToken, expiration);

	return { accessToken, refreshToken, expiration };
}


export const decodeToken = (token, secret) =>
{
	try
	{
		return (jwt.verify(token, secret));
	}
	catch (err)
	{
		if (err.name === 'TokenExpiredError')
		{
			const	error = new Error('Token has expired');
			error.name = 'TokenExpiredError';
			error.expiredAt = err.expiredAt;
			throw (error);
		}
		else if (err.name === 'JsonWebTokenError')
		{
			const	error = new Error('Invalid token');
			error.name = 'JsonWebTokenError';
			throw (error);
		}
		else if (err.name === 'NotBeforeError')
		{
			const	error = new Error('Token not active yet');
			error.name = 'NotBeforeError';
			throw (error);
		}
		else
		{
			throw (err);
		}
	}
}

// Standard validation are done by AJV schema validation in the routes
// This function implements additional custom validation logic
//	Username can't contains reserved words
//	Password can't be too common / too weak or too similar to username/email
export function	validator(username, password, email)
{
	const	psw_lower = password.toLowerCase();
	const	username_lower = username.toLowerCase();
	const	email_lower = email.toLowerCase();

	// Check for reserved words in username
	const	reservedWords = ['admin', 'root', 'user', 'null', 'undefined', 'system'];
	reservedWords.forEach(element =>
	{
		if (username_lower.includes(element))
			throw (new Error(`Username '${username}' is not allowed.`));
	});

	// Check password strength
	const	commonPasswords = ['password', '123456', '123456789', 'qwerty'];
	commonPasswords.forEach(element =>
	{
		if (psw_lower.includes(element))
			throw (new Error('Password is too common.'));
	});

	if (psw_lower.includes(username_lower) || psw_lower.includes(email_lower))
		throw (new Error('Password is too similar to username or email.'));

}