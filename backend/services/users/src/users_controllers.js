
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
		const	profilesDb = req.server.profilesDb;
		const	username = req.body.Username;
		const	userId = req.body.UserId;
		
		const	newUser = await profilesDb.createUserProfile(userId, username);

		console.log('User profile created :', newUser.user_id);
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
		const	profilesDb = req.server.profilesDb; // Changed from usersDb to profilesDb

		const	user = await profilesDb.getUserByUsername(username);
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