import { generateNewTokens, decodeToken, setAuthCookies, clearAuthCookies } from './jwt.js';

import { validator, isTokenExpired, extractUserData, getUserLanguage, createUserProfileInUsersService } from './auth-help.js';
import { sendTwoFactorCode } from './2fa.js';

import bcrypt from 'bcrypt';
import axios from 'axios'

// ------------------------------ROUTES WITHOUT JWT PROTECTION-----------------------------

// SALT ROUNDS are used to hash passwords securely and add an extra variable to the hashing process
// making it more difficult for attackers to use precomputed tables (like rainbow tables) to crack passwords.
// or crack one password and then be able to crack all other passwords with the same hash.
// More rounds means more security but also more processing time.
export const	register = async (req, reply) => 
{
	let	user = null;
	let	authDb = null;

	try
	{
		validator(req.body.username, req.body.password, req.body.email);

		const	username = req.body.username;
		const	email = req.body.email;
		const	hashedpassword = bcrypt.hashSync(req.body.password, parseInt(process.env.HASH_SALT_ROUNDS));
		authDb = req.server.authDb;

		// Create user in auth database
		user = await authDb.createUser(email, hashedpassword);

		await createUserProfileInUsersService(user.id, username);

		console.log('[AUTH] User profile created in users service for user: ', user.id);
 
		// generate access and refresh tokens
		const	newTokens = await generateNewTokens(user, authDb);
		// Set tokens as HTTP-only cookies
		setAuthCookies(reply, newTokens);

		console.log('[AUTH] User registered: ', user.id);

		return (reply.code(201).send({
			message: 'User registered successfully',
			user: { id: user.id, email: user.email }
		}));
	}
	catch (err)
	{
		console.error(`[AUTH] Registration error: ${err.message}`);

		// if the user in auth DB was created but the profile creation failed, delete the auth user
		if (user && authDb) // Check if user and authDb are defined
			await authDb.deleteUserById(user.id);

		if (err.code === 'SQLITE_CONSTRAINT')
		{
			// From authDb
			if (err.message.includes('email'))
			{
				console.error(`Duplicate email attempt`);
				return (reply.code(409).send({ 
					error: 'Registration failed',
					details: 'Email already exists' 
				}));
			}
			
			// From usersDb
			if (err.message.includes('username'))
			{
				console.error(`Duplicate username attempt`);
				return (reply.code(409).send({ 
					error: 'Registration failed',
					details: 'Username already exists' 
				}));
			}
		}

		return (reply.code(500).send({ 
			error: 'Registration failed',
			details: 'An unexpected error occurred during registration' 
		}));
	}
}

export const	login = async (req, reply) =>
{
	try
	{
		const	password = req.body.password;
		const	identifier = req.body.email;
		
		// Validate that we have an identifier
		if (!identifier || !password)
			return (reply.code(400).send({ error: 'Username/email and password are required' }));
		
		// Access database through Fastify instance
		const	authDb = req.server.authDb;
		
		// Get user from database (email normalization handled in DB layer)
		const	user = await authDb.getUserByMail(identifier);
		
		if (!user || await bcrypt.compare(password, user.password) === false)
			return (reply.code(401).send({ error: 'Invalid credentials' }));

		// Check if 2FA is enabled for this user
		if (user.tfa_enabled)
		{
			// Clean up any existing 2FA tokens for this user first
			await authDb.deleteTwoFactorTokenByUserId(user.id);

			const	language = await getUserLanguage(user.id);

			console.log('[AUTH] 2FA sent for user: ', user.id);

			// Send 2FA code and require verification
			return (await sendTwoFactorCode(user, language, authDb, reply));
		}

		const	newTokens = await generateNewTokens(user, authDb);

		// Set tokens as HTTP-only cookies
		setAuthCookies(reply, newTokens);

		console.log('[AUTH] User logged in: ', user.id);

		return (reply.code(200).send({
			message: 'Login successful',
			tfaRequired: false,
			user:
			{
				id: user.id,
				email: user.email
			}
		}));
	}
	catch (err)
	{
		console.log('[AUTH] Login error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// For the logout just the refresh token is needed to delete it from the database
// Access tokens are short-lived and will expire soon anyway (yes they will be valid until expiry)
// No need to invalidate them
export const	logout = async (req, reply) =>
{
	try
	{
		const	refreshToken = req.cookies && req.cookies.refreshToken;
		const	authDb = req.server.authDb;

		// Verify and decode token
		const	decodedToken = decodeToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

		const	storedToken = await authDb.getRefreshTokenByUserId(decodedToken.id);
		
		if (!storedToken || storedToken.refresh_token !== refreshToken)
			return (reply.code(401).send({ error: 'Refresh token not found or already invalidated' }));

		// remove token from DB
		await authDb.deleteRefreshTokenById(storedToken.id);

		clearAuthCookies(reply);

		console.log('[AUTH] User logged out: ', decodedToken.id);

		return (reply.code(200).send({ message: 'Logged out successfully' }));
	}
	catch (err)
	{
		console.log('[AUTH] Logout error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({ error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(401).send({ error: 'Invalid token' }));
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
};

export const	token = async (req, reply) =>
{
	try
	{
		const	refreshToken = req.cookies && req.cookies.refreshToken;
		const	authDb = req.server.authDb;

		// Verify JWT signature
		const	decodedToken = decodeToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

		// Check if token exists in DB
		const	storedToken = await authDb.getRefreshTokenByUserId(decodedToken.id);
		if (!storedToken || storedToken.refresh_token !== refreshToken)
			return (reply.code(401).send({ error: 'Refresh token not found or revoked' }));

		// Check if token is expired
		if (isTokenExpired(storedToken.expires_at))
		{
			await authDb.deleteRefreshTokenById(storedToken.id);
			return (reply.code(401).send({ error: 'Refresh token has expired' }));
		}

		const	user = await authDb.getUserById(decodedToken.id);
	
		const	newTokens = await generateNewTokens(user, authDb);

		// Set tokens as HTTP-only cookies
		setAuthCookies(reply, newTokens);

		console.log('[AUTH] New tokens generated for user: ', user.id);

		return (reply.code(200).send({
			message: 'New tokens generated successfully',
		}));

	}
	catch (err)
	{
		console.log('[AUTH] Token error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({ error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(401).send({ error: 'Invalid token' }));
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	verifyTwoFactorAuth = async (req, reply) =>
{
	try
	{
		const	{ userId, otpCode } = req.body;
		const	authDb = req.server.authDb;

		// Get the stored 2FA token
		const	storedToken = await authDb.getTwoFactorTokenByUserId(userId);
		
		if (!storedToken)
			return (reply.code(401).send({ error: 'No 2FA token found or expired' }));

		// Check if token is expired
		if (isTokenExpired(storedToken.expires_at))
		{
			// Clean up expired token
			await authDb.deleteTwoFactorTokenById(storedToken.id);
			return (reply.code(401).send({ error: '2FA token has expired' }));
		}

		// Verify the OTP code
		if (!await bcrypt.compare(otpCode, storedToken.otp_code))
			return (reply.code(401).send({ error: 'Invalid 2FA code' }));

		// Clean up used token
		await authDb.deleteTwoFactorTokenById(storedToken.id);

		// Get user data
		const	user = await authDb.getUserById(userId);

		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		// Generate tokens for successful 2FA verification
		const	newTokens = await generateNewTokens(user, authDb);
		setAuthCookies(reply, newTokens);

		console.log('[AUTH] 2FA verification successful for user:', user.id);

		return (reply.code(200).send({
			message: '2FA verification successful',
			user:
			{
				id: user.id,
				email: user.email
			},
		}));
	}
	catch (err)
	{
		console.log('[AUTH] 2FA verification error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

export const	enable2FA = async (req, reply) =>
{
	try
	{
		const	tfaEnabled  = req.body.tfaEnabled;
		const	authDb = req.server.authDb;

		const	userData = extractUserData(req);
		
		if (!userData || !userData.id)
			return (reply.code(401).send({ error: 'Invalid user data' }));

		const	updatedUser = await authDb.enable2FA(userData.id, tfaEnabled);

		console.log(`[AUTH] 2FA ${tfaEnabled ? 'enabled' : 'disabled'} for user:`, updatedUser.id);

		if (!updatedUser)
			return (reply.code(404).send({ error: 'User not found' }));

		return (reply.code(200).send({
			message: '2FA setting updated successfully',
			user:
			{
				id: updatedUser.id,
				email: updatedUser.email,
				tfaEnabled: updatedUser.tfa_enabled
			}
		}));
	}
	catch (err)
	{
		console.log(`[AUTH] Update 2FA settings error:`, err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	changePassword = async (req, reply) =>
{
	try
	{
		const	{ oldPassword, newPassword } = req.body;
		const	authDb = req.server.authDb;

		// Extract user data from headers (contains only id and email from JWT)
		const	userData = extractUserData(req);
		
		if (!userData || !userData.id)
			return (reply.code(401).send({ error: 'Invalid user data' }));

		// Get full user data from database (including password hash)
		const	user = await authDb.getUserById(userData.id);

		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		// Verify old password
		if (await bcrypt.compare(oldPassword, user.password) === false)
			return (reply.code(401).send({ error: 'Old password is incorrect' }));

		// Hash new password
		const	hashedNewPassword = bcrypt.hashSync(newPassword, parseInt(process.env.HASH_SALT_ROUNDS));

		// Update password in database
		await authDb.updateUserPassword(user.id, hashedNewPassword);

		console.log('[AUTH] Password changed for user:', user.id);

		return (reply.code(200).send({ message: 'Password changed successfully' }));
	}
	catch (err)
	{
		console.log('[AUTH] Change password error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

export const	deleteAccount = async (req, reply) =>
{
	try
	{
		const	authDb = req.server.authDb;
		const	userData = extractUserData(req);

		await axios.delete(`${process.env.USERS_SERVICE_URL}/delete-user`, {
			headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY },
			data: { userId: userData.id }
		});

		// Delete user from auth database
		await authDb.deleteUserById(userData.id);

		// remove refresh token from DB
		await authDb.deleteRefreshTokenByUserId(userData.id);

		// Notify users service to delete user profile
		// System cascade events will handle deletion of related data in other services

		clearAuthCookies(reply);

		console.log(`[AUTH] User account deleted: ${userData.id}`);

		return (reply.code(200).send({ message: 'User account deleted successfully' }));
	}
	catch (err)
	{
		console.log('[AUTH] Delete account error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// ------------------------------- INTERNAL ROUTES -------------------------------

export const	getAccount = async (req, reply) =>
{
	try
	{
		const	authDb = req.server.authDb;
		const	userId = req.query.id;

		// Get full user data from database
		const	user = await authDb.getUserById(userId);

		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));
		
		return (reply.code(200).send({
			message: 'User account retrieved successfully',
			user:
			{
				id: user.id,
				email: user.email
			}
		}));
	}
	catch (err)
	{
		console.log('[AUTH] Get account error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// Used just to validate access to protected routes
export const	validateToken = async (req, reply) =>
{
	try
	{
		const	token = req.cookies && req.cookies.accessToken;

		// verify and decode ACCESS token (not refresh token!)
		const	decodedToken = decodeToken(token, process.env.ACCESS_TOKEN_SECRET);

		if (!decodedToken || !decodedToken.id)
			return (reply.code(401).send({ error: 'Invalid token' }));

		const	user =  await req.server.authDb.getUserById(decodedToken.id);
		if (!user)
			return (reply.code(404).send({ error: 'User not found' }));

		// Return the complete user data from the token
		return reply.code(200).send({
			message: 'Token is valid', 
			valid: true,
			user:
			{
				id: decodedToken.id,
				email: decodedToken.email
			}
		});
	}
	catch (err)
	{
		console.log('[AUTH] Token validation error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(401).send({error: 'Invalid token' }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
};

