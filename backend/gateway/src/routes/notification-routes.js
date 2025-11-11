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

// 		User logged in:  38b77b05-31c8-497d-95fc-a34177ace239
// ✅ WebSocket authenticated for user: 38b77b05-31c8-497d-95fc-a34177ace239
// (node:19656) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
// (Use `node --trace-deprecation ...` to show where the warning was created)
		
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