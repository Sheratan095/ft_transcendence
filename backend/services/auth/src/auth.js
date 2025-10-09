require('dotenv').config()

const	fastify = require('fastify')({ logger: true })
const	jwt = require('jsonwebtoken')

// Register JSON parser
fastify.register(require('@fastify/jwt'), {secret: process.env.ACCESS_TOKEN_SECRET})


// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
async function	validateApiKey(request, reply)
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