import axios from 'axios'

const	AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(request)
{
	const	headers =
	{
		'x-internal-api-key': API_KEY,
	};

	if (request.user)
		headers['x-user-data'] = JSON.stringify(request.user);

	return (headers);
}

function	forwardCookies(reply, response)
{
	const	setCookie = response.headers['set-cookie'];	

	if (setCookie)	
		reply.header('Set-Cookie', setCookie);
}

export async function	login(request, reply)
{
	try
	{
		const	response = await axios.post(`${AUTH_SERVICE_URL}/login`, request.body, {
			headers: getAuthHeaders(request),
		});

		forwardCookies(reply, response);

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Login error:', err.message)
		if (err.response) {
			console.log('[GATEWAY] Auth response status:', err.response.status)
			console.log('[GATEWAY] Auth response data:', err.response.data)
		}

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export async function	register(request, reply)
{
	try
	{
		const	response = await axios.post(`${AUTH_SERVICE_URL}/register`, request.body, {
			headers: getAuthHeaders(request),
		});

		forwardCookies(reply, response);

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

// Need the refresh token from cookies
export async function	logout(request, reply)
{
	try
	{
		// In Axios, during a DELETE request, the request body must be sent as the 'data' property in the config object
		// unlike POST requests where the body is the second argument
		const	response = await axios.delete(`${AUTH_SERVICE_URL}/logout`, {
			headers: {
					...getAuthHeaders(request),
					cookie: request.headers.cookie
				},
			withCredentials: true
		});

		forwardCookies(reply, response);

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export async function	deleteAccount(request, reply)
{
	try
	{
		const	response = await axios.delete(`${AUTH_SERVICE_URL}/delete-account`, {
			headers: getAuthHeaders(request),
			cookie: request.headers.cookie
		});

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

// Need the refresh token from cookies
export async function	token(request, reply)
{
	try
	{
		const	response = await axios.post(`${AUTH_SERVICE_URL}/token`, request.body, {
			headers: {
					...getAuthHeaders(request),
					cookie: request.headers.cookie
				},
			withCredentials: true
		});

		forwardCookies(reply, response);

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export async function	verifyTwoFactorAuth(request, reply)
{
	try
	{
		const response = await axios.post(`${AUTH_SERVICE_URL}/2fa`, request.body, {
			headers: getAuthHeaders(request)
		});

		forwardCookies(reply, response);

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export async function	enable2FA(request, reply)
{
	try
	{
		const	response = await axios.put(`${AUTH_SERVICE_URL}/enable-2fa`, request.body, {
			headers: getAuthHeaders(request)
		});

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}

export async function	changePassword(request, reply)
{
	try
	{
		const	response = await axios.put(`${AUTH_SERVICE_URL}/change-password`, request.body, {
			headers: getAuthHeaders(request)
		});

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Auth service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Authentication service unavailable' }))
	}
}
