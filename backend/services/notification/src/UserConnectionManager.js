class	UserConnectionManager
{
	constructor()
	{
		this._connections = new Map(); // userId -> WebSocket
	}

	addConnection(userId, socket)
	{
		this._connections.set(userId, socket);
	}

	removeConnection(userId)
	{
		this._connections.delete(userId);
	}

	getConnection(userId)
	{
		return (this._connections.get(userId));
	}

	count()
	{
		return (this._connections.size);
	}
}

export const	userConnectionManager = new UserConnectionManager();