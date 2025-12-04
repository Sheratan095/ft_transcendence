// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { extractUserData, checkBlock, notifyUserAddedToChat, notifyMessageStatusUpdates } from './chat-help.js';

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

		const	rawMessages = await chatDb.getMessagesByChatIdForUser(chatId, userId, limit, offset);
		// Add the overallor message status just if the message is sent from the requestor user
		for (const message of rawMessages)
		{
			if (message.sender_id === userId)
				message.message_status = await chatDb.getOverallMessageStatus(message.id);
			else
				message.message_status = undefined;
		}

		// map to match the response schema
		const	messages = rawMessages.map(msg => ({
			id: msg.id,
			chatId: msg.chat_id,
			senderId: msg.sender_id,
			content: msg.content,
			type: msg.type,
			createdAt: msg.created_at,
			messageStatus: msg.message_status
		}));

		console.log(`[CHAT] User ${userId} fetched ${messages.length} messages for chat ${chatId} (limit: ${limit}, offset: ${offset})`);

		// Update messages in requested chat statuses to 'delivered' for this user
		const	deliveredTime = await chatDb.markMessagesAsDelivered(chatId, userId);

		// Notify senders about the status update if the overall status changed
		await notifyMessageStatusUpdates(chatId, deliveredTime, chatDb);

		return (reply.code(200).send(messages));

	}
	catch (err)
	{
		console.error('[CHAT] Error in getMessages controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	addUserToChat = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	{ chatId, toUserId } = req.body;

		// Check if the inviter is a member of the chat
		if (await chatDb.isUserInChat(userId, chatId) === false)
		{
			console.log(`[CHAT] User ${userId} attempted to invite to chat ${chatId} without membership`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'User not a member of the chat' }));
		}

		if (await checkBlock(userId, toUserId))
		{
			console.log(`[CHAT] Failed to send message because the relation between ${toUserId} and ${userId} is blocked`);
			return;
		}

		// Add the user to the chat
		await chatDb.addUserToChat(chatId, toUserId);

		const	toUsername = await chatConnectionManager.getUsernameFromCache(toUserId, true);
		const	fromUsername = await chatConnectionManager.getUsernameFromCache(userId, true);

		if (await notifyUserAddedToChat(toUserId, userId, fromUsername, chatId) == false)
			console.error(`[CHAT] Failed to notify user ${toUserId} about being added to chat ${chatId}`);

		// Add system message to chat and notify room
		const	message = `User ${toUsername || toUserId} has been added to the chat by ${fromUsername || userId}.`;
		const	messageId = await chatDb.addMessageToChat(chatId, userId, message, 'user_join');
		chatConnectionManager.sendSystemMsgToRoom(messageId, chatId, message, chatDb);

		console.log(`[CHAT] User ${userId} added user ${toUserId} to chat ${chatId}`);

		return (reply.code(200).send({ success: true }));
	}
	catch (err)
	{
		// Catch error if user is already in chat
		if (err.code === 'USER_ALREADY_IN_CHAT')
		{
			console.log(`[CHAT] Attempted to add user to chat but user is already a member`);
			return (reply.code(400).send({ error: 'Bad Request', message: 'User is already a member of the chat' }));
		}

		// Catch error if the chat isn't group type
		if (err.code === 'CHAT_NOT_GROUP_TYPE')
		{
			console.log(`[CHAT] Attempted to invite user to a non-group chat`);
			return (reply.code(400).send({ error: 'Bad Request', message: 'Cannot invite users to a non-group chat' }));
		}

		console.error('[CHAT] Error in inviteInChat controller:', err);

		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	createGroupChat = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	{ name } = req.body;

		// Create the group chat
		const	chatId = await chatDb.createGroupChat(name);
		console.log(`[CHAT] User ${userId} created group chat ${chatId} with name "${name}"`);

		// Add creator to the chat
		await chatDb.addUserToChat(chatId, userId);
		console.log(`[CHAT] User ${userId} added to newly created group chat ${chatId}`);

		// Get the created chat with all details
		const	chat = await chatDb.getChatById(chatId);
		
		// Add creator's username to the response
		const	creatorUsername = await chatConnectionManager.getUsernameFromCache(userId, true);
		const	chatResponse = {
			id: chat.id,
			name: chat.name,
			chatType: chat.chat_type,
			createdAt: chat.created_at,
			members: [{
				userId: userId,
				username: creatorUsername
			}]
		};

		return reply.code(201).send(chatResponse);
	}
	catch (err)
	{
		console.error('[CHAT] Error in createGroupChat controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}