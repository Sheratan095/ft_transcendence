
let users = [
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
];

export const	getUsers = async (req, reply) =>
{
	console.log('Fetching users');
	return (reply.code(200).send(users));	
} 