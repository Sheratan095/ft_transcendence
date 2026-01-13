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
			console.error(`[AUTH] Missing required environment variable: ${envVar}`);
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
// The trhows can be caught and transformed into proper HTTP responses in the controllers
//	that's way ther's a custom statusCode property in some errors
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
			throw (Object.assign(new Error(`Username '${username}' is not allowed.`), { statusCode: 442 }));
	});

	// Check password strength
	const	commonPasswords = ['password', '123456', '123456789', 'qwerty'];
	commonPasswords.forEach(element =>
	{
		if (psw_lower.includes(element))
			throw (Object.assign(new Error('Password is too common.'), { statusCode: 442 }));
	});

	if (psw_lower.includes(username_lower) || psw_lower.includes(email_lower))
		throw (Object.assign(new Error('Password is too similar to username or email.'), { statusCode: 442 }));
}

export function	formatDate(date)
{
	// Convert date to 'YYYY-MM-DD HH:MM:SS' format (sqlite format)
	//	from js format 'YYYY-MM-DDTHH:MM:SS.sssZ'
	const	pad = n => String(n).padStart(2, '0');

	return (
		date.getUTCFullYear() + '-' +
		pad(date.getUTCMonth() + 1) + '-' +
		pad(date.getUTCDate()) + ' ' +
		pad(date.getUTCHours()) + ':' +
		pad(date.getUTCMinutes()) + ':' +
		pad(date.getUTCSeconds())
	);
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
		console.log('[AUTH] Error parsing user data from headers:', err.message);
		return (null);
	}
}

export async function	getUserLanguage(userId)
{
	const	reply = await axios.get(`${process.env.USERS_SERVICE_URL}/user?id=${userId}`, { headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY }});
	return (reply.data.language);
}

export async function	createUserProfileInUsersService(userId, username)
{
	try
	{
		const	newUserReply = await axios.post(`${process.env.USERS_SERVICE_URL}/new-user`, 
			{ username: username, userId: userId },
			{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		);

		return (newUserReply.data);
	}
	catch (err)
	{
		// Handle axios errors and transform them into meaningful errors
		if (err.response)
		{
			const status = err.response.status;
			const errorData = err.response.data;

			if (status === 409)
			{
				// Username already exists
				const error = new Error(errorData.error || 'SQLITE_CONSTRAINT username already exist');
				error.code = 'SQLITE_CONSTRAINT';
				error.statusCode = 409;
				throw error;
			}
			
			if (status === 442)
			{
				// Internal error in users service
				const error = new Error('Internal server error in users service');
				error.code = 442;
				error.statusCode = 442;
				throw error;
			}

			// Other HTTP errors
			const error = new Error(errorData.error || 'Users service error');
			error.statusCode = status;
			error.originalError = err;
			throw error;
		}

		// Network or other errors
		throw err;
	}
}

export async function	createUserStatsInGames(userId)
{
	try
	{
		await axios.post(`${process.env.PONG_SERVICE_URL}/create-user-stats`,
			{ userId: userId },
			{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		);

		axios.post(`${process.env.TRIS_SERVICE_URL}/create-user-stats`,
			{ userId: userId },
			{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		);
	}
	catch (err)
	{
		console.error('[AUTH] Error creating user stats in games services: ', err);
		// throw (err);
	}
}

export async function	deleteUserStatsInGames(userId)
{
	try
	{
		await axios.delete(`${process.env.PONG_SERVICE_URL}/delete-user-stats`, {
			headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY },
			data: { userId: userId }
		});

		await axios.delete(`${process.env.TRIS_SERVICE_URL}/delete-user-stats`, {
			headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY },
			data: { userId: userId }
		});
	}
	catch (err)
	{
		console.error('[AUTH] Error deleting user stats in games services:', err);
		throw (err);
	}
}