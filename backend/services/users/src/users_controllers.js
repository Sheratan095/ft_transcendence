
import { extractUserData } from './users_help.js';

let users = [
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
];

export const	getUsers = async (req, reply) =>
{
	try
	{
		// Extract user data from gateway headers
		const userData = extractUserData(req);

		console.log('Authenticated user:', userData);

		console.log('Fetching users');
		return (reply.code(200).send(users));	
	}
	catch (err)
	{
		console.log('GetUsers error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}

} 

export const	createUser = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;

		console.log('User created:', newUser);
		return (reply.code(201).send(newUser));	
	}
	catch (err)
	{
		console.log('CreateUser error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUser = async (req, reply) =>
{
	try
	{
		const	username = req.params.username; // From URL parameter
		const	usersDb = req.server.usersDb;

		const	user = await usersDb.getUserByUsername(username);
		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		console.log('Fetching user:', username);

		return (reply.code(200).send(user));
	}
	catch (err)
	{
		console.log('GetUser error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}