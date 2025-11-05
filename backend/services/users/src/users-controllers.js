
import { extractUserData, getAccount } from './users-help.js';
import { pipeline } from 'stream/promises';
import { createWriteStream, existsSync } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteUserRelationships } from './relationships-controllers.js';


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

		return (reply.code(200).send(users));
	}
	catch (err)
	{
		console.log('GetUsers error:', err.message);
		
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

		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		// Get account details from auth service
		const	account = await getAccount(user.id);
		if (!account)
			return (reply.code(404).send({ error: 'Account not found' }));

		console.log('Fetching user:', username || id);

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

		return (reply.code(200).send(response));
	}
	catch (err)
	{
		console.log('GetUser error:', err.message);
		
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

		const	updatedUser = await usersDb.updateUser(user.id, newUsername, newLanguage);

		console.log(`User ${user.id} updated`);

		return (reply.code(200).send(updatedUser));
	}
	catch (err)
	{
		console.log('UpdateUser error:', err.message);

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
			return (reply.code(400).send({ error: 'No file uploaded' }));

		// Validate file type (images only)
		const	allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
		if (!allowedMimeTypes.includes(data.mimetype))
			return (reply.code(400).send({ error: 'Only image files are allowed (jpeg, png, gif, webp)' }));

		// Generate unique filename with extension
		const	fileExtension = data.filename.split('.').pop();
		const	filename = `${user.id}_${Date.now()}.${fileExtension}`;

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
					console.error(`Failed to delete old avatar: ${unlinkErr.message}`);
					// Continue even if deletion fails - don't block the upload
				}
			}
		}

		// Save file to disk
		await pipeline(data.file, createWriteStream(filePath));
		
		// Update database with avatar URL
		await usersDb.updateUserAvatar(user.id, avatarUrl);

		console.log(`Avatar uploaded for user ${user.id}: ${filename}`);

		return reply.code(200).send({
			message: 'Avatar uploaded successfully',
			avatarUrl: avatarUrl
		});
	}
	catch (err)
	{
		console.log('UploadAvatar error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------INTERAL ROUTES-----------------------------

export const	createUser = async (req, reply) =>
{
	try
	{
		const	usersDb = req.server.usersDb;
		const	username = req.body.username;
		const	userId = req.body.userId;

		const	newUser = await usersDb.createUserProfile(userId, username);

		return (reply.code(201).send(newUser));
	}
	catch (err)
	{
		console.log('CreateUser error:', err.message);

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

		// Delete user from database
		await usersDb.deleteUserById(userId);

		console.log(`User profile deleted: ${userId}`);

		return (reply.code(200).send({ message: 'User profile deleted successfully' }));
	}
	catch (err)
	{
		console.log('DeleteUser error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}
