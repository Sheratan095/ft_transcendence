// The class is initialized in ChatConnectionManager.js
import { chatConnectionManager } from './ChatConnectionManager.js';
import { notifyMessageStatusUpdates, getRelationshipByIds } from './chat-help.js';

export function	handleNewConnection(socket, req, chatDb)
{
	const	key = req.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY)
	{
		console.error('[CHAT] Missing or invalid internal API key on proxied websocket request');

		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (null);
	}

	const	userId = req.headers['x-user-id'];

	if (!userId)
	{
		console.error('[CHAT] No authenticated user found for websocket connection');
		try { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); } catch (e) {}
		try { socket.destroy(); } catch (e) {}

		return (null);
	}

	chatConnectionManager.addConnection(userId, socket, chatDb);

	return (userId);
}

export function	handleError(err, userId)
{
	console.log(`[CHAT] WebSocket error for user ${userId} in handler: ${err.message}`);
}

export function	handleClose(socket, userId)
{
	console.log(`[CHAT] WebSocket connection closed - User: ${userId}`);

	chatConnectionManager.removeConnection(userId);
}

export function	handleMessage(socket, msg, userId, chatDb)
{
	try
	{
		const	message = JSON.parse(msg.toString());

		switch (message.event)
		{
			case 'ping': // Handle ping event
				console.log(`[CHAT] Ping received from user ${userId}`);
				socket.send(JSON.stringify({ event: 'pong', data: { timestamp: Date.now() } }));
				break;

			case 'chat.read':
				handleChatRead(userId, message.data, chatDb);
				break;

			case 'chat.chatMessage':
				handleChatMessage(userId, message.data, chatDb);
				break;

			case 'chat.privateMessage':
				handlePrivateMessage(userId, message.data, chatDb);
				break;

			default:
				console.log(`[CHAT] Unknown event: ${message.event}`);
				chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
				break;
		}
	}
	catch (err)
	{
		console.error(`[CHAT] Error parsing message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Invalid message format');
	}
}

async function	handleChatMessage(userId, data, chatDb)
{
	try
	{
		const	{ chatId, content } = data;

		// Enhanced validation
		if (!chatId || typeof chatId !== 'string')
		{
			console.log(`[CHAT] Invalid chatId from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Invalid chat ID');
			return;
		}

		if (!content || typeof content !== 'string' || content.trim().length === 0)
		{
			console.log(`[CHAT] Empty or invalid content from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Message content cannot be empty');
			return;
		}

		// Check if chat exists and user is in the chat
		if (!(await chatDb.isUserInChat(userId, chatId)))
		{
			console.log(`[CHAT] User ${userId} attempted to send message to chat ${chatId} without membership`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to this chat');
			return;
		}

		// Verify it's a group chat
		const	chatType = await chatDb.getChatType(chatId);
		if (chatType !== 'group')
		{
			console.log(`[CHAT] User ${userId} attempted to send group message to non-group chat ${chatId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send group message to a non-group chat');
			return;
		}

		// Trim and limit content length
		const	sanitizedContent = content.trim().substring(0, 2000); // 2000 char limit

		// Store message in database
		const	messageId = await chatDb.addMessageToChat(chatId, userId, sanitizedContent);

		// Send to recipients (including sender)
		const	status = await chatConnectionManager.sendMsgToChat(chatId, userId, messageId, sanitizedContent, chatDb);
		const	targetName = await chatConnectionManager.getGroupChatNameFromCache(chatId, chatDb);

		// Always acknowledge to sender to ensure they see their own message
		await chatConnectionManager.replyToMessage(userId, chatId, messageId, status, sanitizedContent, 'group', targetName);

		console.log(`[CHAT] Group message from user ${userId} to ${chatId} sent successfully, overall status: ${status}`);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling group message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to send message');
	}
}

async function handlePrivateMessage(userId, data, chatDb)
{
	try
	{
		const	{ toUserId, content } = data;

		// Validation
		if (!toUserId || !content)
		{
			console.log(`[CHAT] Invalid private message data`);
			chatConnectionManager.sendErrorMessage(userId, 'Missing required fields');
			return;
		}

		// Cannot send message to yourself
		if (toUserId === userId)
		{
			console.log(`[CHAT] User ${userId} attempted to send a private message to themselves`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot send message to yourself');
			return;
		}

		// The users must be friends to send private messages
		const	relation = await getRelationshipByIds(userId, toUserId);
		if (!relation || relation.relationshipStatus !== 'accepted')
		{
			console.log(`[CHAT] User ${userId} attempted to send a private message to non-friend user ${toUserId}`);
			return (reply.code(403).send({ error: 'Forbidden', message: 'Can only send private messages to friends' }));
		}

		// Validate that receiver exists before creating chat
		const	receiverUsername = await chatConnectionManager.getUsernameFromCache(toUserId, true);
		if (!receiverUsername)
		{
			console.log(`[CHAT] User ${userId} attempted to send private message to non-existent user ${toUserId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Recipient user does not exist');
			return;
		}

		// If chat already exists, returns the existing one
		const	chatId = await chatDb.createPrivateChat(userId, toUserId);

		// Store message in database
		const	messageId = await chatDb.addMessageToChat(chatId, userId, content);

		// Send to recipient
		const	delivered = await chatConnectionManager.sendToUser(userId, toUserId, messageId, content, chatDb, chatId);

		const	targetName = await chatConnectionManager.getUsernameFromCache(toUserId);

		// Acknowledge to sender
		const	status = delivered ? 'delivered' : 'sent';
		chatConnectionManager.replyToMessage(userId, chatId, messageId, status, content, 'dm', targetName);

		console.log(`[CHAT] Private message from user ${userId} to user ${toUserId} sent successfully`);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling private message from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to send private message');
	}
}

async function	handleChatRead(userId, data, chatDb)
{
	try
	{
		const	{ chatId } = data;

		// Validation
		if (!chatId)
		{
			console.log(`[CHAT] Invalid chat read data from user ${userId}`);
			chatConnectionManager.sendErrorMessage(userId, 'Missing required fields for chat read');
			return;
		}

		// Check if chat exists and user is in the chat
		if (!(await chatDb.isUserInChat(userId, chatId)))
		{
			console.log(`[CHAT] ${userId} try to mark messages as read in ${chatId} but he isn't in the chat`);
			chatConnectionManager.sendErrorMessage(userId, 'Cannot mark messages as read in this chat');
			return;
		}

		// Mark all message status for this user in this chat as read
		//  only updates messages that aren't already 'read' to reduce writes
		const	updatedTime = await chatDb.markMessagesAsRead(chatId, userId);

		// Notify senders about the status update
		await notifyMessageStatusUpdates(chatId, updatedTime, chatDb);
	}
	catch (err)
	{
		console.error(`[CHAT] Error handling chat read from user ${userId}:`, err.message);
		chatConnectionManager.sendErrorMessage(userId, 'Failed to mark messages as read');
	}
}