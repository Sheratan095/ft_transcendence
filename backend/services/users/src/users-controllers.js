
import { extractUserData, getAccount, getActiveUsersCount } from './users-help.js';
import { pipeline } from 'stream/promises';
import { createWriteStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteUserRelationships } from './relationships-controllers.js';
import { hasUncaughtExceptionCaptureCallback } from 'process';


const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

export const	getUsers = async (req, reply) =>
{
	try
	{
		// Extract user data from gateway headers
		const	usersDb = req.server.usersDb;
		const	users = await usersDb.getAllUsers();

		const	requestingUser = extractUserData(req);
		if (requestingUser)
			console.log(`[USERS] GetUsers requested by user: ${requestingUser.id}`);

		return (reply.code(200).send(users));
	}
	catch (err)
	{
		console.log('[USERS] GetUsers error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	searchUser = async (req, reply) =>
{
	try
	{
		const	query = req.query.q;
		const	usersDb = req.server.usersDb;
		const	user = extractUserData(req);

		const	rows = await usersDb.searchUsers(query);

		const	results = rows.map(row => ({
			id: row.id,
			username: row.username,
			avatarUrl: row.avatar_url,
		}));

		// console.log(`[USERS] SearchUser "${query}" requested by user: ${user.id}, found ${results.length} results`);

		return reply.code(200).send(results);
	}
	catch (err)
	{
		console.log('[USERS] SearchUser error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUsersStats = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;

		const	totalUsers = await usersDb.getTotalUserCount();
		const	activeUsers = await getActiveUsersCount();

		console.log(`[USERS] GetUsersStats requested`);

		return reply.code(200).send({
			totalUsers: totalUsers,
			activeUsers: activeUsers
		});
	}
	catch (err)
	{
		console.log('[USERS] GetUserStats error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	getUser = async (req, reply) =>
{
	try
	{
		const	{ id, username } = req.query;
		const	usersDb = req.server.usersDb;

		let	user = null;

		if (id)
			user = (await usersDb.getUserById(id));
		else if (username)
			user = (await usersDb.getUserByUsername(username));
		else
			return (reply.code(400).send({ error: 'Please provide either username or id query parameter' }));

		if (!user || user.deleted)
			return (reply.code(404).send({ error: 'User not found' }));

		// Get account details from auth service
		const	account = await getAccount(user.id);
		if (!account)
			return (reply.code(404).send({ error: 'Account not found' }));

		// SQLite returns created_at as a string, not a Date object
		// Map snake_case fields to camelCase for API response
		const	response =
		{
			id: user.id,
			username: user.username,
			language: user.language,
			avatarUrl: user.avatar_url,
			email: account.email,
			createdAt: user.created_at, // Already a string in ISO format from SQLite
		};

		const	requestingUser = extractUserData(req);
		if (requestingUser)
			console.log(`[USERS] GetUser ${user.id} requested by ${requestingUser.id}`);

		return (reply.code(200).send(response));
	}
	catch (err)
	{
		console.log('[USERS] GetUser error:', err.message);
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	updateUser = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;

		const	newUsername = req.body.newUsername;
		const	newLanguage = req.body.newLanguage;

		const	user = extractUserData(req);
		if (!user)
		{
			console.log('[USERS] UpdateUser error: User data missing in request');
			return (reply.code(401).send({ error: 'Unauthorized' }));
		}

		// Check if new username is already taken
		if (newUsername)
		{
			const	existingUser = await usersDb.getUserByUsername(newUsername);
			if (existingUser && existingUser.id !== user.id)
			{
				console.log('[USERS] UpdateUser error: Username already taken');
				return (reply.code(409).send({ error: 'Username already taken' }));
			}
		}

		const	updatedUser = await usersDb.updateUser(user.id, newUsername, newLanguage);

		console.log(`[USERS] User ${user.id} updated`);

		return (reply.code(200).send(updatedUser));
	}
	catch (err)
	{
		console.log('[USERS] UpdateUser error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	uploadAvatar = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	user = extractUserData(req);

		// Get current user data to check for existing avatar
		const	currentUser = await usersDb.getUserById(user.id);
		
		// Get the uploaded file
		const	data = await req.file();
		if (!data)
		{
			console.log('[USERS] UploadAvatar error: No file uploaded');
			return (reply.code(400).send({ error: 'No file uploaded' }));
		}

		// Validate file type (images only)
		const	allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedMimeTypes.includes(data.mimetype))
		{
			console.log('[USERS] UploadAvatar error: Invalid file type');
			return (reply.code(400).send({ error: 'Only image files are allowed (jpeg, png, gif, webp)' }));
		}

		// Generate unique filename with extension with user ID
		const	fileExtension = data.filename.split('.').pop();
		const	filename = `${user.id}.${fileExtension}`;

		// Define paths
		const	avatarsDir = path.join(__dirname, '../data/avatars');
		const	filePath = path.join(avatarsDir, filename);
		const	avatarUrl = `/avatars/${filename}`; // Relative URL to store in DB

		// Delete old avatar if it exists
		if (currentUser.avatar_url)
		{
			const	oldFilename = path.basename(currentUser.avatar_url);
			const	oldFilePath = path.join(avatarsDir, oldFilename);

			if (existsSync(oldFilePath))
			{
				try
				{
					await unlink(oldFilePath);
					console.log(`Deleted old avatar: ${oldFilename}`);
				}
				catch (unlinkErr)
				{
					console.log(`Failed to delete old avatar: ${unlinkErr.message}`);
					// Continue even if deletion fails - don't block the upload
				}
			}
		}

		// Save file to disk
		await pipeline(data.file, createWriteStream(filePath));
		
		// Update database with avatar URL
		await usersDb.updateUserAvatar(user.id, avatarUrl);

		console.log(`[USERS] Avatar uploaded for user ${user.id}: ${filename}`);

		return reply.code(200).send({
			message: 'Avatar uploaded successfully',
			avatarUrl: avatarUrl
		});
	}
	catch (err)
	{
		console.log('[USERS] UploadAvatar error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------INTERAL ROUTES-----------------------------

export const	getUsernameById = async (req, reply) =>
{
	try
	{
		const	userId = req.query.userId;
		const	usersDb = req.server.usersDb;

		const	user = await usersDb.getUserById(userId);
		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		// console.log(`[USERS] GetUsernameById for userId: ${userId}`);

		return (reply.code(200).send({ username: user.username }));
	}
	catch (err)
	{
		console.log('[USERS] GetUsernameById error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	createUser = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	username = req.body.username;
		const	userId = req.body.userId;

		const	newUser = await usersDb.createUserProfile(userId, username);

		console.log('[USERS] User profile created in users service for user: ', userId);

		return (reply.code(201).send(newUser));
	}
	catch (err)
	{
		console.log('[USERS] CreateUser error:', err.message);

		if (err.code === 'SQLITE_CONSTRAINT')
			return (reply.code(409).send({ error: 'SQLLITE_CONSTRAINT username already exist' }));

		// Custom error for better log in auth controller
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	deleteUser = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	userId = req.body.userId;

		deleteUserRelationships(req, reply);

		// Remove avatar file if exists
		const	user = await usersDb.getUserById(userId);
		if (user && user.avatar_url)
		{
			const	avatarsDir = path.join(__dirname, '../data/avatars');
			const	avatarFilename = path.basename(user.avatar_url);
			const	avatarFilePath = path.join(avatarsDir, avatarFilename);

			if (existsSync(avatarFilePath))
			{
				try
				{
					await unlink(avatarFilePath);
					console.log(`Deleted avatar for user ${userId}: ${avatarFilename}`);
				}
				catch (unlinkErr)
				{
					console.log(`Failed to delete avatar for user ${userId}: ${unlinkErr.message}`);
					// Continue even if deletion fails
				}
			}
		}

		// Delete user from database
		await usersDb.deleteUserById(userId);

		console.log(`[USERS] User profile deleted: ${userId}`);

		return (reply.code(200).send({ message: 'User profile deleted successfully' }));
	}
	catch (err)
	{
		console.log('[USERS] DeleteUser error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}
