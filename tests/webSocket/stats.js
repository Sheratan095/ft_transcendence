process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const	response = await fetch(`https://localhost:3000/users/stats`, {
	method: 'GET',
});

console.log('Response status:', response.status);
console.log('Response headers:', response.headers);

const data = await response.json();
console.log('User stats:', JSON.stringify(data, null, 2));