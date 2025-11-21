// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';

// Example controller for sending system messages to a room (called via HTTP)
export const	sendSystemMessage = async (req, reply) =>
{
	try
	{
		const	{ roomId, message } = req.body;
		
		if (!roomId || !message)
		{
			return reply.code(400).send({
				error: 'Bad Request',
				message: 'Missing roomId or message'
			});
		}

		chatConnectionManager.sendToRoom(
			roomId,
			'chat.system',
			{
				roomId,
				message,
				timestamp: new Date().toISOString()
			}
		);

		return (reply.code(200).send({ success: true }));
	}
	catch (err)
	{
		console.error('[CHAT] Error in sendSystemMessage controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	getChats = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	chats = await chatDb.getChatsByUserId(userId);

		console.log(chats)
	}
	catch (err)
	{
		console.error('[CHAT] Error in getChats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}