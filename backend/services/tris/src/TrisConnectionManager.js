// Chat connection manager handles WebSocket connections and message routing
class	TrisConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
		console.log(`[TRIS] User ${userId} connected`);
	}

	removeConnection(userId)
	{
		this._connections.delete(userId);
		console.log(`[TRIS] User ${userId} disconnected`);
	}

	getConnection(userId)
	{
		return (this._connections.get(userId));
	}

	count()
	{
		return (this._connections.size);
	}

	async	sendErrorMessage(userId, message)
	{
		const	socket = this._connections.get(userId);
		if (socket)
			this.#dispatchEventToSocket(socket, 'error', { message });
	}

	#dispatchEventToSocket(socket, event, data)
	{
		if (socket)
		{
			try
			{
				socket.send(JSON.stringify({ event, data }));
			}
			catch (e)
			{
				console.error(`[TRIS] Failed to send ${event}:`, e.message);
			}
		}
	}

}

export const	trisConnectionManager = new TrisConnectionManager();
