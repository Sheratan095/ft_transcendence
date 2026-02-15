// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';

import {
	extractUserData,
	notifyUserAddedToChat,
	notifyMessageStatusUpdates,
	getRelationshipByIds,
	formatDate
} from './chat-help.js';

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
					name: row.name, // Will be updated for DM chats after collecting all members
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

		// For DM chats, set the name as the other user's username
		for (const chat of chatsMap.values())
		{
			if (chat.chatType === 'dm')
			{
				const	otherMember = chat.members.find(m => String(m.userId) !== String(userId));
				if (otherMember)
					chat.name = otherMember.username;
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

		if (!chatId)
		{
			console.log(`[CHAT] User ${userId} attempted to fetch messages without providing chatId`);
			return (reply.code(400).send({ error: 'Bad Request', message: 'chatId query parameter is required' }));
			}

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
		const	messages = await Promise.all(rawMessages.map(async msg => ({
			id: msg.id,
			chatId: msg.chat_id,
			senderId: msg.sender_id,
			from: (msg.type == 'text') ? await chatConnectionManager.getUsernameFromCache(msg.sender_id) : null, // Only set 'from' for text messages, null for system messages
			content: msg.content,
			type: msg.type,
			createdAt: msg.created_at,
			messageStatus: msg.message_status
		})));

		// console.log(`[CHAT] User ${userId} fetched ${messages.length} messages for chat ${chatId} (limit: ${limit}, offset: ${offset})`);

		const timestamp = formatDate(new Date());

		// Update messages in requested chat statuses to 'delivered' for this user
		await chatDb.markMessagesAsDelivered(chatId, userId, timestamp);

		// Notify senders about the status update if the overall status changed
		await notifyMessageStatusUpdates(chatId, timestamp, chatDb);

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

		// The users must be friends to be added to the chat
		const	relation = await getRelationshipByIds(userId, toUserId);
		if (!relation || relation.relationshipStatus !== 'accepted')
		{
			console.log(`[CHAT] User ${userId} attempted to add non-friend user ${toUserId} to chat ${chatId}`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'Can only add friends to the chat' }));
		}

		const	timestamp = formatDate(new Date());
		const	toUsername = await chatConnectionManager.getUsernameFromCache(toUserId, true);
		const	fromUsername = await chatConnectionManager.getUsernameFromCache(userId, true);

		// Add system message to chat and notify chat
		await chatConnectionManager.sendUserJoinToChat(chatId, toUserId, toUsername, userId, fromUsername, chatDb, timestamp);

		// Add the user to the chat
		await chatDb.addUserToChat(chatId, toUserId, timestamp);

		const chatName = await chatDb.getChatName(chatId);

		// Notify the user newly added to the chat by sending a `chat.joined` event
		try {
			await chatConnectionManager.sendChatJoinedToUser(chatId, toUserId, fromUsername, `You were added to "${chatName}" by ${fromUsername}.`, timestamp);
		} catch (notifyErr) {
			console.error(`[CHAT] Failed to send chat.joined to user ${toUserId} for chat ${chatId}:`, notifyErr);
			// Fallback: attempt the older notification method
			try {
				const fallback = chatConnectionManager.notifyNewlyAddedUser(toUserId, chatId, chatName, fromUsername);
				if (fallback === false) console.error(`[CHAT] Fallback notifyNewlyAddedUser also failed for user ${toUserId}`);
			} catch (fallbackErr) {
				console.error(`[CHAT] Fallback notify failed for user ${toUserId}:`, fallbackErr);
			}
		}

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

		const	timestamp = formatDate(new Date());

		// Create the group chat
		const	chatId = await chatDb.createGroupChat(name, timestamp);
		console.log(`[CHAT] User ${userId} created group chat ${chatId} with name "${name}"`);

		// Add creator to the chat
		await chatDb.addUserToChat(chatId, userId, timestamp);
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

export const	leaveGroupChat = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	{ chatId } = req.body;

		// Check if the chat is a group chat
		const	chatType = await chatDb.getChatType(chatId);
		if (chatType !== 'group')
		{
			console.log(`[CHAT] User ${userId} attempted to leave non-group chat ${chatId}`);
			return (reply.code(400).send({ error: 'Bad Request', message: 'Cannot leave a non-group chat' }));
		}

		// Check if the user is a member of the chat
		if (await chatDb.isUserInChat(userId, chatId) === false)
		{
			console.log(`[CHAT] User ${userId} attempted to leave chat ${chatId} without membership`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'User not a member of the chat' }));
		}

		const	timestamp = formatDate(new Date());

		// Remove the user from the chat
		await chatDb.removeUserFromChat(chatId, userId);

		// Cleanup: Remove user's message statuses for this chat
		await chatDb.removeUserMessageStatusesFromChat(chatId, userId);

		// Add system message to chat and notify chat
		const	username = await chatConnectionManager.getUsernameFromCache(userId, true);

		await chatConnectionManager.sendUserLeaveToChat(chatId, userId, username, chatDb, timestamp);

		console.log(`[CHAT] User ${userId} left group chat ${chatId}`);

		return (reply.code(200).send({ success: true }));
	}
	catch (err)
	{
		console.error('[CHAT] Error in leaveGroupChat controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	startPrivateChat = async (req, reply) =>
{
	try
	{
		const	chatDb = req.server.chatDb;
		const	userId = extractUserData(req).id;

		const	{ toUserId } = req.body;

		if (userId === toUserId)
		{
			console.log(`[CHAT] User ${userId} attempted to start a private chat with themselves`);
			return (reply.code(400).send({ error: 'Bad Request', message: 'Cannot start a private chat with yourself' }));
		}

		// The users must be friends to start a private chat
		const	relation = await getRelationshipByIds(userId, toUserId);
		if (!relation || relation.relationshipStatus !== 'accepted')
		{
			console.log(`[CHAT] User ${userId} attempted to start a private chat with non-friend user ${toUserId}`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'Can only start private chats with friends' }));
		}

		// Validate that receiver exists before creating chat
		const	receiverUsername = await chatConnectionManager.getUsernameFromCache(toUserId, true);
		if (!receiverUsername)
		{
			console.log(`[CHAT] User ${userId} attempted to send private message to non-existent user ${toUserId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Recipient user does not exist');
			return;
		}

		// If a private chat between these users already exists, return that chat id
		const	existingChat = await chatDb.getPrivateChatByUsers(userId, toUserId);
		if (existingChat)
		{
			console.log(`[CHAT] User ${userId} requested existing private chat with user ${toUserId}: chat ${existingChat.id}`);
			return (reply.code(200).send({ chatId: existingChat.id }));
		}

		// Create new DM chat
		const	timestamp = formatDate(new Date());
		const	chatId = await chatDb.createPrivateChat(userId, toUserId, timestamp);

		const	fromUsername = await chatConnectionManager.getUsernameFromCache(userId, true);
		const	message = `${fromUsername} want to chat with you.`;
		await chatDb.addMessageToChat(chatId, null, message, timestamp, 'chat_created');

		console.log(`[CHAT] Created new DM chat ${chatId} between users ${userId} and ${toUserId}`);

		return (reply.code(200).send({ chatId }));
	}
	catch (err)
	{
		console.error('[CHAT] Error in startPrivateChat controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	deleteUsernameFromCache = async (req, reply) =>
{
	try
	{
		const	userId = req.body.userId;

		// Force refresh the username in cache, it will be "Unknown" if deleted or updated in case of username change
		await chatConnectionManager.getUsernameFromCache(userId, true);

		console.log(`[CHAT] Deleted username cache for user ${userId}`);

		return (reply.code(200).send({ success: true }));
	}
	catch (err)
	{
		console.error('[CHAT] Error in deleteUsernameFromCache controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	removeWsConnection = async (req, reply) =>
{
	try
	{
		const	userId = req.body.userId;

		chatConnectionManager.removeConnection(userId);

		console.log(`[CHAT] Removed WebSocket connection for user ${userId}`);

		return (reply.code(200).send({ success: true }));
	}
	catch (err)
	{
		console.error('[CHAT] Error in removeWsConnection controller:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}