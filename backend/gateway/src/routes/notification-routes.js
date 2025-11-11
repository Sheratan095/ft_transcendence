import httpProxy from 'http-proxy';
import { authenticateJwtWebSocket } from '../gateway-help.js';

const	proxy = httpProxy.createProxyServer({ target: process.env.NOTIFICATION_SERVICE_URL, ws: true });

export async function	handleSocketUpgrade(req, socket, head)
{
	try
	{
		// Authenticate WebSocket connection using JWT from cookies
		const	user = await authenticateJwtWebSocket(req);
		
		console.log(`✅ WebSocket authenticated for user: ${user.id}`);
		
		// Attach user data to request so notification service can access it
		req.user = user;
		
		// Proxy to notification service
		proxy.ws(req, socket, head);
	}
	catch (err)
	{
		console.log('❌ WebSocket authentication failed:', err.message);
		
		// Send 401 Unauthorized and close connection
		socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
		socket.destroy();
	}
}