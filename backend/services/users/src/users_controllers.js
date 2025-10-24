
import { extractUserData } from './users_help.js';

export const	getUsers = async (req, reply) =>
{
	try
	{
		// Extract user data from gateway headers
		const	usersDb = req.server.usersDb;
		const	users = await usersDb.getAllUsers();
		
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
		const	username = req.body.Username;
		const	userId = req.body.UserId;
		
		const	newUser = await usersDb.createUserProfile(userId, username);

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
		const	usersDb = req.server.usersDb; // Changed back to usersDb

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