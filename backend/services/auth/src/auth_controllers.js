import jwt from 'jsonwebtoken';
import { generateAccessToken } from './auth_help.js';
import { getExpirationDate } from './auth_help.js';
import bcrypt from 'bcrypt';


export const	register = async (req, reply) =>
{
	const	username = req.body.username
	const	hashedpassword = bcrypt.hashSync(req.body.password, parseInt(process.env.HASH_SALT_ROUNDS));

	// ALL STANDARD VALIDATIONS ARE DONE IN THE SCHEMA OF THE ROUTE
	// if (!username || !password || !email)
	// 	return (reply.code(400).send({ error: 'Username, email and password are required' }))

	try
	{
		const	authDb = req.server.authDb;

		const	user = await authDb.createUser(username, hashedpassword, req.body.email)

		console.log('User registered: ', user.id)

		// generate access and refresh tokens
		const	accessToken = generateAccessToken({ id: user.id, email: user.email });

		const	refreshToken = jwt.sign({ id: user.id, email: user.email }, process.env.REFRESH_TOKEN_SECRET);

		// Set expiration
		const	expiresAt = getExpirationDate(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);
		authDb.insertRefreshToken(user.id, refreshToken, expiresAt);

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
