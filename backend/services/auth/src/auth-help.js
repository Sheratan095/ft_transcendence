import axios from "axios";

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

export function	checkEnvVariables(requiredEnvVars)
{
	let	missingEnvVarsCount = 0;

	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.error(`Missing required environment variable: ${envVar}`);
			missingEnvVarsCount++;
		}
	}

	if (missingEnvVarsCount > 0)
		process.exit(1);
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

export function	formatExpirationDate(date)
{
	// Keep the ISO format to preserve timezone information for proper parsing
	return (date.toISOString());
}

export function	isTokenExpired(expirationDate)
{
	const	now = new Date();
	const	expiresAt = new Date(expirationDate);
	return (now > expiresAt);
}

export function	getExpirationDateByDays(days)
{
	//												hours min sec  ms
	const	expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

	return (expiresAt);
}

export function	getExpirationDateByMinutes(minutes)
{
	//												hours min sec  ms
	const	expiresAt = new Date(Date.now() + minutes * 60 * 1000);

	return (expiresAt);
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

export async function	getUserLanguage(userId)
{
	const	reply = await axios.get(`${process.env.USERS_SERVICE_URL}/user?id=${userId}`, { headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY }});
	return (reply.data.language);
}

export async function	usernameExists(username)
{
	try
	{
		const	usernameCheck = await axios.get(`${process.env.USERS_SERVICE_URL}/user?username=${username}`,
		{
			headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY }
		});

		// If we get any response (not 404), username already exists
		return (true);
	}
	catch (err)
	{
		// If error is 404, username does not exist
		if (err.response && err.response.status === 404)
			return (false);

		// For other errors, rethrow
		throw (err);
	}
}