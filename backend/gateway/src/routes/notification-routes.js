import httpProxy from 'http-proxy';
import { authenticateJwtWebSocket } from '../gateway-help.js';

const	proxy = httpProxy.createProxyServer({ target: process.env.NOTIFICATION_SERVICE_URL, ws: true });

// Prevent uncaught 'error' events from crashing the process.
// Handle both HTTP and WebSocket proxy errors and close/destroy sockets gracefully.
proxy.on('error', (err, req, resOrSocket) =>
{
	console.error('⚠️ Proxy error:', err && err.message ? err.message : err);

	// If this is an HTTP response object, send a 502
	try
	{
		if (resOrSocket && typeof resOrSocket.writeHead === 'function')
		{
			// standard http.ServerResponse
			resOrSocket.writeHead(502, { 'Content-Type': 'text/plain' });
			resOrSocket.end('Bad gateway');

			return;
		}

		// If this is a raw socket (WebSocket upgrade), try to write a simple response and destroy
		if (resOrSocket && typeof resOrSocket.write === 'function')
		{
			try { resOrSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n'); } catch (e) {}
			try { resOrSocket.destroy(); } catch (e) {}

			return;
		}

		// Fallback: attempt to destroy the request socket
		if (req && req.socket && typeof req.socket.destroy === 'function')
			req.socket.destroy();
	}
	catch (e)
	{
		// swallow any secondary errors to avoid crashing
		console.error('⚠️ Error while handling proxy error:', e && e.message ? e.message : e);
	}
});

export async function	handleSocketUpgrade(req, socket, head)
{
	try
	{
		// Authenticate WebSocket connection using JWT from cookies
		const	user = await authenticateJwtWebSocket(req);

		console.log(`WebSocket authenticated for user: ${user.id}`);

		// Also inject forwarding headers so the proxied service (different process)
		// can reconstruct the authenticated user. We include an internal API key
		// to prevent spoofing and only use simple fields (id, email).
		req.headers = req.headers || {};

		if (user && user.id)
			req.headers['x-user-id'] = user.id;
		if (process.env.INTERNAL_API_KEY)
			req.headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;

		// Ensure socket errors are handled locally (prevents uncaught exceptions)
		socket.on('error', (err) =>
		{	
			if (err.code === 'ECONNRESET' || err.code === 'EPIPE')
			{
				console.log(`ℹ️ Socket closed early (${err.code}) — likely client disconnect`);
				return;
			}

			console.error('⚠️ WebSocket socket error:', err && err.message ? err.message : err);
			try { socket.destroy(); } catch (e) {}
		});

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