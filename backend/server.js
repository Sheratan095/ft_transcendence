import Fastify from 'fastify'
import Bcrypt from 'bcrypt'

const	app = Fastify({ logger: false })

const users = [
  { name: 'Alice', password: 'password1' },
  { name: 'Bob', password: 'password2' },
]

app.get('/users', (request, reply) => {
  reply.send(users)
})

app.post('/users', async (request, reply) => {
	try
	{
		const	salt = await Bcrypt.genSalt()
		const	hashedPassword = await Bcrypt.hash(request.body.password, salt)

		// console.log(salt)
		// console.log(hashedPassword)

		const	user = { name: request.body.name, password: hashedPassword }
		users.push(user)

		reply.status(201).send(user)

	}catch (error)
	{
		console.error(error)

		return (reply.status(500).send({ error: 'Internal Server Error' }))
	}

})

app.post('/users/login', async (request, reply) => {
	const	targetUser = users.find(user => user.name === request.body.name)
	if (!targetUser)
		return (reply.status(400).send({ error: 'Cannot find user' }))

	try
	{
		if (await Bcrypt.compare(request.body.password, targetUser.password))
			return (reply.send({ message: 'Success' }))
		else
			return (reply.status(403).send({ error: 'Not Allowed' }))
	}catch (error)
	{
		console.error(error)
		return (reply.status(500).send({ error: 'Internal Server Error' }))
	}
})

app.listen({ port: 3000 })