import axios from 'axios'

const	TRIS_URL = process.env.TRIS_SERVICE_URL;
const	API_KEY = process.env.INTERNAL_API_KEY;

function	getAuthHeaders(req)
{
	return ({
		'x-internal-api-key': API_KEY,
		'x-user-data': JSON.stringify(req.user)
	});
}

export const	getTrisTest = async (req, reply) =>
{
	// Forward request to users service with user data
	try
	{
		const	response = await axios.get(`${TRIS_URL}/init`, {
			headers: getAuthHeaders(req)
		})

		console.log('[GATEWAY] Tris service response:', response.data)

		return (reply.send(response.data))
	}
	catch (err)
	{
		console.log('[GATEWAY] Tris service error:', err.message)

		if (err.response)
			return (reply.code(err.response.status).send(err.response.data))

		return (reply.code(500).send({ error: 'Tris service unavailable' }))
	}
}