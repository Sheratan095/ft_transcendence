import { generateNewTokens, decodeToken} from './auth_help.js';
import bcrypt from 'bcrypt';

// SALT ROUNDS are used to hash passwords securely and add an extra variable to the hashing process
// making it more difficult for attackers to use precomputed tables (like rainbow tables) to crack passwords.
// or crack one password and then be able to crack all other passwords with the same hash.
// More rounds means more security but also more processing time.

export const	register = async (req, reply) => 
{
	const	username = req.body.username
	const	hashedpassword = bcrypt.hashSync(req.body.password, parseInt(process.env.HASH_SALT_ROUNDS));

	try
	{
		const	authDb = req.server.authDb;

		const	user = await authDb.createUser(username, hashedpassword, req.body.email)

		console.log('User registered: ', user.id)
 
		// generate access and refresh tokens
		const	newTokens = await generateNewTokens(user, authDb);

		return (reply.code(201).send({
			message: 'User registered successfully',
			user:
			{
				id: user.id,
				username: user.username,
				email: user.email
			},
			tokens: 
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken
			}
		}));
	}
	catch (err)
	{
		console.log('Registration error:', err.message)

		if (err.code === 'SQLITE_CONSTRAINT')
			return (reply.code(409).send({ error: 'Username already exists' }))

		return (reply.code(500).send({ error: 'Internal server error' }))
	}
}

export const	login = async (req, reply) =>
{
	const	password = req.body.password;
	const	identifier = req.body.username || req.body.email;

	try
	{
		// Access database through Fastify instance
		const	authDb = req.server.authDb;
		
		// Get user from database
		const	user = await authDb.getUserByUsernameOrEmail(identifier);
		
		if (!user)
			return (reply.code(401).send({ error: 'Invalid credentials' }));

		if (await bcrypt.compare(password, user.password) === false)
			return (reply.code(401).send({ error: 'Invalid credentials' }));

		const	newTokens = await generateNewTokens(user, authDb);

		console.log('User logged in: ', user.id);

		return (reply.code(200).send({
			message: 'Login successful',
			user:
			{
				id: user.id,
				username: user.username,
				email: user.email
			},
			tokens:
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken
			}
		}));
	}
	catch (err)
	{
		console.log('Login error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// For the logout just the refresh token is needed to delete it from the database
// Access tokens are short-lived and will expire soon anyway (yes they will be valid until expiry)
// No need to invalidate them
export const	logout = async (req, reply) =>
{
	const	refreshToken = req.body.refreshToken;

	try
	{
		const	authDb = req.server.authDb;

		// verify and decode token
		const	decodedToken = decodeToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

		// remove token from DB
		await authDb.deleteRefreshToken(decodedToken.id, refreshToken);

		return (reply.code(200).send({ message: 'Logged out successfully' }));
	}
	catch (err)
	{
		console.log('Logout error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return reply.code(401).send({ error: 'Token has expired' });
		else if (err.name === 'JsonWebTokenError')
			return reply.code(401).send({ error: 'Invalid token' });
		
		return reply.code(500).send({ error: 'Internal server error' });
	}
};

// Used just to validate access to protected routes
export const	validateToken = async (req, reply) =>
{
	const	token = req.body.token;

	try
	{
		// verify and decode ACCESS token (not refresh token!)
		const	decodedToken = decodeToken(token, process.env.ACCESS_TOKEN_SECRET);

		return (reply.code(200).send({ message: 'Token is valid', userId: decodedToken.id, valid: true}));
	}
	catch (err)
	{
		console.log('Token validation error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(498).send({error: 'Invalid token' }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
};

export const	token = async (req, reply) =>
{
	return reply.code(501).send({ error: 'Not implemented yet' });
}

// Goal	Recommended Action	Why
// Logout securely	Delete refresh token from DB	Prevent reuse after logout
// Multi-device logout	Delete token by ID or all tokens for user	Control per-device sessions
// Prevent brute force	Add rate limiting (login attempts)	Stop attackers guessing passwords
// Prevent spam registration	Throttle by IP, require CAPTCHA or email verification	Stop mass signups
// Prevent token spam	Add short cooldown (optional)	Avoid repeated login requests
//await fastify.register(import('fastify-rate-limit'), {
//   max: 5, // requests
//   timeWindow: '5 minutes', // time window
//   keyGenerator: (req) => req.body.username || req.ip
// });