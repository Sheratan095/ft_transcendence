// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { extractUserData, notifyMessageStatusUpdates } from './chat-help.js';

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

		console.log(`[CHAT] Fetching chats for user ${userId}`);

		const	rawChats = await chatDb.getChatsByUserId(userId);

		// Group by chat_id and aggregate members
		const	chatsMap = new Map();
		
		for (const row of rawChats)
		{
			if (!chatsMap.has(row.chat_id))
			{
				chatsMap.set(row.chat_id, {
					id: row.chat_id,
					name: row.name || null,
					chatType: row.chat_type,
					createdAt: row.created_at,
					joinedAt: row.joined_at,
					members: []
				});
			}
			
			// Add member info (will need to fetch username from users service)
			const	chat = chatsMap.get(row.chat_id);
			if (row.user_id && !chat.members.find(m => m.userId === row.user_id))
			{
				chat.members.push({
					userId: row.user_id,
					username: await chatConnectionManager.getUsernameFromCache(row.user_id)
				});
			}
		}

		const	chats = Array.from(chatsMap.values());

		return (reply.code(200).send(chats));
	}
	catch (err)
	{
		console.error('[CHAT] Error in getChats controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	getMessages = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	chatId = req.query.chatId;
		const	limit = req.query.limit;
		const	offset = req.query.offset;

		if (await chatDb.isUserInChat(userId, chatId) === false)
		{
			console.log(`[CHAT] User ${userId} attempted to access messages for chat ${chatId} without membership`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'User not a member of the chat' }));
		}

		const	rawMessages = await chatDb.getMessagesByChatId(chatId, limit, offset);
		// Add the overallor message status just if the message is sent from the requestor user
		for (const message of rawMessages)
		{
			if (message.sender_id === userId)
				message.message_status = await chatDb.getOverallMessageStatus(message.id);
			else
				message.message_status = undefined;
		}

		console.log(`[CHAT] User ${userId} fetched ${rawMessages.length} messages for chat ${chatId} (limit: ${limit}, offset: ${offset})`);

		// Update messages in requested chat statuses to 'delivered' for this user
		const	deliveredTime = await chatDb.markMessagesAsDelivered(chatId, userId);
		// Notify senders about the status update if the overall status changed
		await notifyMessageStatusUpdates(chatId, deliveredTime, chatDb);

		return (reply.code(200).send(rawMessages));

	}
	catch (err)
	{
		console.error('[CHAT] Error in getMessages controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}