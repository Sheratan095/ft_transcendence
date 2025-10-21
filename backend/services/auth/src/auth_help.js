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
	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.error(`Missing required environment variable: ${envVar}`);
			process.exit(1);
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

export function	formatExpirationDate(date)
{
	const	expiresAtStr = date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

	return (expiresAtStr);
}