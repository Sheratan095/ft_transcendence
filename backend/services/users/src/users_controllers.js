
import { extractUserData } from './users_help.js';

let users = [
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
];

export const	getUsers = async (req, reply) =>
{
	// Extract user data from gateway headers
	const userData = extractUserData(req);

	console.log('Authenticated user:', userData);

	console.log('Fetching users');
	return (reply.code(200).send(users));	
} 