
let users = [
	{ id: '1', name: 'Alice' },
	{ id: '2', name: 'Bob' },
];

export const	getUsers = async (req, reply) =>
{
	return (reply.code(200).send(users));	
} 