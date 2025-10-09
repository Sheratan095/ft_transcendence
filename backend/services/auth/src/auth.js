import dotenv from 'dotenv';
dotenv.config();
import { AuthDatabase } from './authdb.js';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';

const	fastify = Fastify({ logger: true });
let		authDatabase;


// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
async function	validateApiKey(request, reply)
{
	console.log('Register request received in gateway:', request.body)

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

let	refreshTokens = []


fastify.post('/token', { preHandler: validateApiKey }, async (request, reply) =>
{
	const	refreshToken = request.body.token

	if (refreshToken == null)
		return (reply.code(401).send())
	if (!refreshTokens.includes(refreshToken))
		return (reply.code(403).send())
	
	try
	{
		const	user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
		const	accessToken = generateAccessToken({ name: user.name })

		return (reply.send({ accessToken: accessToken }))
	}
	catch (err)
	{
		return (reply.code(403).send())
	}
})

fastify.delete('/logout', async (request, reply) =>
{
	// refreshTokens = refreshTokens.filter(token => token !== request.body.token)
	// return (reply.code(204).send())
})

fastify.post('/login', { preHandler: validateApiKey }, async (request, reply) =>
{
	// Authenticate User


	const	username = request.body.username
	const	user = { name: username }

	const	accessToken = generateAccessToken(user)
	const	refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
	refreshTokens.push(refreshToken)

	return (reply.send({ accessToken: accessToken, refreshToken: refreshToken }))
})

fastify.post('/register', { preHandler: validateApiKey }, async (request, reply) =>
{	


	const	username = request.body.username
	const	password = request.body.password

	if (!username || !password)
		return (reply.code(400).send({ error: 'Username and password are required' }))

	try
	{
		// TO DO hash password before storing and check if the query was successful
		const	userId = await authDatabase.createUser(username, password)
		return (reply.code(201).send({ message: 'User registered successfully', userId: userId }))
	}
	catch (err)
	{
		if (err.code === 'SQLITE_CONSTRAINT_UNIQUE')
			return (reply.code(409).send({ error: 'Username already exists' }))
		return (reply.code(500).send({ error: 'Internal server error' }))
	}
})

// This endpoint should only be called by the gateway
fastify.post('/validate-token', { preHandler: validateApiKey }, async (request, reply) =>
{
	const	token = request.body.token

	if (!token)
		return (reply.code(401).send({ error: 'Token is required' }))

	try
	{
		const	user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
		return (reply.send({ valid: true, user: user }))
	}
	catch (err)
	{
		return (reply.code(403).send({ valid: false, error: 'Invalid token' }))
	}
})

function	generateAccessToken(user)
{
	return (jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15s' }))
}

const	start = async () => {
	try
	{
		// // Register JSON parser
		// await fastify.register(import('@fastify/jwt'), {secret: process.env.ACCESS_TOKEN_SECRET});

		authDatabase = new AuthDatabase()
		await authDatabase.initialize()

		await fastify.listen({ port: 4000, host: '0.0.0.0' })
		console.log('Server is running on port 4000')
	}
	catch (err)
	{
		fastify.log.error(err)
		process.exit(1)
	}
}
start()