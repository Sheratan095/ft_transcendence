// The class is initialized in UserConnectionManager.js
import { userConnectionManager } from './UserConnectionManager.js';
import { sendOTPEmail } from './notification-help.js'

export const	sendFriendRequest = async (req, reply) =>
{
	try
	{
		const	{ requesterUsername, targetUserId, requesterId } = req.body;
		userConnectionManager.sendFriendRequestNotification(targetUserId, requesterUsername, requesterId);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendFriendRequest handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	sendFriendAccept = async (req, reply) =>
{
	try
	{
		const	{ requesterId, accepterUsername, accepterId } = req.body;

		userConnectionManager.sendFriendRequestAccept(requesterId, accepterUsername, accepterId);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in sendFriendAccept handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}

export const	send2FaCode = async (req, reply) =>
{
	try
	{
		const	{ email, otpCode, language, expiryMinutes } = req.body;

		await sendOTPEmail(email, otpCode, language, expiryMinutes);

		return (reply.code(200).send());
	}
	catch (err)
	{
		console.error('[NOTIFICATION] Error in send2FaCode handler:', err);
		return (reply.code(500).send({error: 'Internal server error' }));
	}
}