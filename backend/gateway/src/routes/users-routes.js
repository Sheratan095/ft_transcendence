import axios from 'axios'

const	USERS_URL = process.env.USERS_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(req)
{
	return ({
		'x-internal-api-key': API_KEY,
		'x-user-data': JSON.stringify(req.user)
	});
}

export const	getUsers = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${USERS_URL}/`, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	searchUsers = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${USERS_URL}/search`, {
			params: req.query,
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Users service error:', err.message)
		if (err.response) {
			console.log('[GATEWAY] Users service status:', err.response.status)
			console.log('[GATEWAY] Users service data:', err.response.data)
		}

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	getUser = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${USERS_URL}/user`, {
			params: req.query,
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	updateUser = async (req, reply) =>
{
	try
	{
		const	response = await axios.put(`${USERS_URL}/update-user`, req.body, {
			headers: getAuthHeaders(req)
		})

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Users service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Users service unavailable' }))
	}
}

export const	uploadAvatar = async (req, reply) =>
{
	try
	{
		// Forward the multipart request to users service
		const	data = await req.file();
		
		if (!data)
			return (reply.code(400).send({ error: 'No file uploaded' }));

		// Create FormData to forward the file properly
		const	FormData = (await import('form-data')).default;
		const	formData = new FormData();
		
		// Append the file stream to FormData with proper metadata
		formData.append('file', data.file, {
			filename: data.filename,
			contentType: data.mimetype
		});

		// Forward to users service with proper multipart/form-data
		const	response = await axios.post(`${USERS_URL}/upload-avatar`, formData, {
			headers: {
				...formData.getHeaders(),
				...getAuthHeaders(req)
			},
			maxBodyLength: Infinity,
			maxContentLength: Infinity
		});

		return (reply.send(response.data));
	}
	catch (err)
	{
		console.log('[GATEWAY] Users service error:', err.message);

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data));

		return (reply.code(500).send({ error: 'Users service unavailable' }));
	}
}