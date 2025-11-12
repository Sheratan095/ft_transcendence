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

		// Attach user data to request so notification service can access it
		req.user = user;

		// User logged in:  38b77b05-31c8-497d-95fc-a34177ace239
		// ✅ WebSocket authenticated for user: 38b77b05-31c8-497d-95fc-a34177ace239
		// (node:19656) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
		// (Use `node --trace-deprecation ...` to show where the warning was created)

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