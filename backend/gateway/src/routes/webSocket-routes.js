import httpProxy from 'http-proxy';
import { authenticateJwtWebSocket } from '../gateway-help.js';

// Create proxy servers without specific targets - we'll set them dynamically
const	notificationProxy = httpProxy.createProxyServer({ ws: true });
const	chatProxy = httpProxy.createProxyServer({ ws: true });

// Prevent uncaught 'error' events from crashing the process.
// Handle both HTTP and WebSocket proxy errors and close/destroy sockets gracefully.
const	handleProxyError = (err, req, resOrSocket) =>
{
	console.error('[GATEWAY] Proxy error:', err && err.message ? err.message : err);

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
		console.error('[GATEWAY] Error while handling proxy error:', e && e.message ? e.message : e);
	}
};

notificationProxy.on('error', handleProxyError);
chatProxy.on('error', handleProxyError);

export async function	handleSocketUpgrade(req, socket, head)
{
	try
	{
		// Authenticate WebSocket connection using JWT from cookies
		const	user = await authenticateJwtWebSocket(req);

		// Also inject forwarding headers so the proxied service (different process)
		//	can reconstruct the authenticated user.
		// We include an internal API key for service to service comunication
		req.headers['x-user-id'] = user.id;
		req.headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;

		// Ensure socket errors are handled locally (prevents uncaught exceptions)
		socket.on('error', (err) =>
		{	
			if (err.code === 'ECONNRESET' || err.code === 'EPIPE')
			{
				console.log(`[GATEWAY] Socket closed early (${err.code}) — likely client disconnect`);
				return;
			}

			console.log('[GATEWAY] WebSocket socket error:', err && err.message ? err.message : err);
			try { socket.destroy(); } catch (e) {}
		});

		// Route to appropriate service based on URL path
		const	url = new URL(req.url, `http://${req.headers.host}`);
		
		if (url.pathname === '/chat/ws')
		{
			console.log(`[GATEWAY] WebSocket Authenicated, routing connection to CHAT service for user: ${user.id}`);
			// Rewrite the URL to /ws for the chat service
			req.url = '/ws';
			chatProxy.ws(req, socket, head, { target: process.env.CHAT_SERVICE_URL });
		}
		else if (url.pathname === '/notifications/ws')
		{
			console.log(`[GATEWAY] WebSocket Authenicated, routing connection to NOTIFICATION service for user: ${user.id}`);
			// Rewrite the URL to /ws for the notification service
			req.url = '/ws';
			notificationProxy.ws(req, socket, head, { target: process.env.NOTIFICATION_SERVICE_URL });
		}
		else
		{
			console.log(`[GATEWAY] Unknown WebSocket path: ${url.pathname}`);
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
			socket.destroy();
		}
	}
	catch (err)
	{
		if (err && err.message === 'Authentication failed')
			console.log('[GATEWAY] WebSocket authentication failed:', err.message);
		else
			console.log('[GATEWAY] WebSocket proxy failed:', err.message);

		// Send 401 Unauthorized and close connection
		socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
		socket.destroy();
	}
}