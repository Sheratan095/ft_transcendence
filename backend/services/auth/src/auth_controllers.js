import jwt from 'jsonwebtoken';
import { generateAccessToken } from './auth_help.js';
import { getExpirationDate } from './auth_help.js';

export const	register = async (req, reply) =>
{
	const	username = req.body.username
	const	password = req.body.password

	// ALL STANDARD VALIDATIONS ARE DONE IN THE SCHEMA OF THE ROUTE
	// if (!username || !password)
	// 	return (reply.code(400).send({ error: 'Username and password are required' }))

	try
	{
		const	authDb = req.server.authDb;

		// TO DO: hash password before storing
		const	user = await authDb.createUser(username, password)

		console.log('User registered: ', user.id)

		// generate tokens upon registration
		console.log('Before creating:', await authDb.getTokens());

		const	accessToken = generateAccessToken({ id: user.id, username: user.username });
		const	refreshToken = jwt.sign({ id: user.id, username: user.username }, process.env.REFRESH_TOKEN_SECRET);

		// Set expiration to 7 days from now
		const	expiresAt = getExpirationDate(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);
		authDb.insertRefreshToken(user.id, refreshToken, expiresAt);

		console.log('after creating:', await authDb.getTokens());

		return (reply.code(201).send(
			{
				message: 'User registered successfully',
				userId: user.id,
				accessToken: accessToken,
				refreshToken: refreshToken
			}
		));
	}
	catch (err)
	{
		console.log('Registration error:', err.message)

		if (err.code === 'SQLITE_CONSTRAINT')
			return (reply.code(409).send({ error: 'Username already exists' }))

		return (reply.code(500).send({ error: 'Internal server error' }))
	}
}

export const login = async (req, reply) =>
{
	const username = req.body.username;
	const password = req.body.password;

	if (!username || !password)
		return (reply.code(400).send({ error: 'Username and password are required' }));

	try
	{
		// Access database through Fastify instance
		const authDb = req.server.authDb;
		
		// Get user from database
		const user = await authDb.getUserByUsername(username);
		
		if (!user)
			return (reply.code(401).send({ error: 'Invalid credentials' }));
		
		// TO DO: Compare hashed password instead of plain text
		if (user.password !== password)
			return (reply.code(401).send({ error: 'Invalid credentials' }));

		// Generate tokens
		const userPayload = { name: username, id: user.id };
		const accessToken = generateAccessToken(userPayload);
		const refreshToken = jwt.sign(userPayload, process.env.REFRESH_TOKEN_SECRET);
		refreshTokens.push(refreshToken);

		return (reply.send({ accessToken: accessToken, refreshToken: refreshToken }));
	}
	catch (err)
	{
		console.log('Login error:', err.message);
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}
