import jwt from 'jsonwebtoken';
import { generateAccessToken } from './auth_help.js';

// Store refresh tokens (in production, use a database)
const refreshTokens = [];

export const register = async (req, reply) =>
{
	const	username = req.body.username
	const	password = req.body.password

	if (!username || !password)
		return (reply.code(400).send({ error: 'Username and password are required' }))

	try
	{
		// TO DO hash password before storing and check if the query was successful
		// const	userId = await authDatabase.createUser(username, password)
		const	userId = 1; // Placeholder until database is implemented

		return (reply.code(201).send({ message: 'User registered successfully', userId: userId }))
	}
	catch (err)
	{
		console.log('Registration error:', err.message)
		if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
			return (reply.code(409).send({ error: 'Username already exists' }))
		return (reply.code(500).send({ error: 'Internal server error' }))
	}
}

export const login = async (req, reply) =>
{
	console.log('arriva al login');

	// Authenticate User
	const	username = req.body.username
	const	user = { name: username }

	const	accessToken = generateAccessToken(user)
	const	refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
	refreshTokens.push(refreshToken)

	return (reply.send({ accessToken: accessToken, refreshToken: refreshToken }))
}
