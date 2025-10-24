import { generateNewTokens, decodeToken} from './jwt.js';
import { validator, isTokenExpired, extractUserData, getUserLanguage } from './auth_help.js';
import { sendTwoFactorCode } from './2fa.js';
import bcrypt from 'bcrypt';
import axios from 'axios'

// SALT ROUNDS are used to hash passwords securely and add an extra variable to the hashing process
// making it more difficult for attackers to use precomputed tables (like rainbow tables) to crack passwords.
// or crack one password and then be able to crack all other passwords with the same hash.
// More rounds means more security but also more processing time.

export const	register = async (req, reply) => 
{
	try
	{
		validator(req.body.username, req.body.password, req.body.email);

		const	username = req.body.username.toLowerCase();
		const	email = req.body.email.toLowerCase();
		const	hashedpassword = bcrypt.hashSync(req.body.password, parseInt(process.env.HASH_SALT_ROUNDS));
		const	authDb = req.server.authDb;

		// Check if the username already exists
		try
		{
			const	usernameCheck = await axios.get(`${process.env.USERS_SERVICE_URL}/user?username=${username}`, {
				headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY }});
			
			// If we get any response (not 404), username already exists
			return (reply.code(409).send({ error: 'Username already exists' }));
		}
		catch (err)
		{
			// If error is NOT 404, then it's a real error
			if (err.response && err.response.status !== 404)
			{
				console.log('Error checking username:', err.message);
				return (reply.code(500).send({ error: 'Error checking username availability' }));
			}
			// If it's 404, username is available - continue with registration
		}
		
		// Create user in auth database
		const user = await authDb.createUser(email, hashedpassword);
		
		// Create user profile in users service
		try
		{
			await axios.post(`${process.env.USERS_SERVICE_URL}/new-user`, 
				{ Username: username, UserId: user.id },
				{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
			);
		}
		catch (err)
		{
			console.log('Error creating user profile:', err.message);
			// Continue with registration even if profile creation fails
		}

		console.log('User registered: ', user.id)
 
		// generate access and refresh tokens
		const	newTokens = await generateNewTokens(user, authDb);

		return (reply.code(201).send({
			message: 'User registered successfully',
			user:
			{
				id: user.id,
				email: user.email
			},
			tokens: 
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
				expiration: newTokens.expiration
			}
		}));
	}
	catch (err)
	{
		console.log('Registration error:', err.message)

		// Handle validation errors from validator function
		if (err.message.includes('Username') || err.message.includes('Password')) 
			return (reply.code(400).send({ error: err.message }))

		if (err.code === 'SQLITE_CONSTRAINT')
		{
			if (err.message.includes('username'))
				return (reply.code(409).send({ error: 'Username already exists' }))
			if (err.message.includes('email'))
				return (reply.code(409).send({ error: 'Email already exists' }))
		}

		return (reply.code(500).send({ error: 'Internal server error' }))
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
		
		const	identifierLower = identifier.toLowerCase();
		
		// Access database through Fastify instance
		const	authDb = req.server.authDb;
		
		// Get user from database
		const	user = await authDb.getUserByMail(identifierLower);
		
		if (!user || await bcrypt.compare(password, user.password) === false)
			return (reply.code(401).send({ error: 'Invalid credentials' }));

		// Check if 2FA is enabled for this user
		if (user.tfa_enabled)
		{
			// Clean up any existing 2FA tokens for this user first
			await authDb.deleteTwoFactorTokenByUserId(user.id);

			const	language = await getUserLanguage(user.id);
			console.log('User language for 2FA:', language);
			
			// Send 2FA code and require verification
			return (await sendTwoFactorCode(user, language, authDb, reply));
		}

		const	newTokens = await generateNewTokens(user, authDb);

		console.log('User logged in: ', user.id);

		return (reply.code(200).send({
			message: 'Login successful',
			tfaRequired: false,
			user:
			{
				id: user.id,
				email: user.email
			},
			tokens:
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
				expiration: newTokens.expiration
			}
		}));
	}
	catch (err)
	{
		console.log('Login error:', err.message);

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
		const	refreshToken = req.body.refreshToken;
		const	authDb = req.server.authDb;

		// Verify and decode token
		const	decodedToken = decodeToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

		const	storedToken = await authDb.getRefreshTokenByUserId(decodedToken.id);
		
		if (!storedToken || storedToken.refresh_token !== refreshToken)
			return (reply.code(401).send({ error: 'Refresh token not found or already invalidated' }));

		// remove token from DB - use correct parameters: tokenId, userId, refresh_token
		await authDb.deleteRefreshTokenById(storedToken.id);

		console.log('User logged out: ', decodedToken.id);

		return (reply.code(200).send({ message: 'Logged out successfully' }));
	}
	catch (err)
	{
		console.log('Logout error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({ error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(401).send({ error: 'Invalid token' }));
		
		return (reply.code(500).send({ error: 'Internal server error' }));
	}
};

// Used just to validate access to protected routes
export const	validateToken = async (req, reply) =>
{
	try
	{
		const	token = req.body.token;

		// verify and decode ACCESS token (not refresh token!)
		const	decodedToken = decodeToken(token, process.env.ACCESS_TOKEN_SECRET);

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
		console.log('Token validation error:', err.message);
		
		if (err.name === 'TokenExpiredError')
			return (reply.code(401).send({error: 'Token has expired' }));
		else if (err.name === 'JsonWebTokenError')
			return (reply.code(401).send({error: 'Invalid token' }));

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
};

export const	token = async (req, reply) =>
{
	try
	{
		const	refreshToken = req.body.refreshToken;
		const	authDb = req.server.authDb;

		// Verify JWT signature
		const	decodedToken = decodeToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
		console.log('Decoded refresh token for user: ', decodedToken.id);

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

		console.log('New tokens generated for user: ', user.id);

		return (reply.code(200).send({
			message: 'New tokens generated successfully',
			tokens:
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
				expiration: newTokens.expiration
			}
		}));

	}
	catch (err)
	{
		console.log('Token error:', err.message);
		
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
		const	now = new Date();
		const	expiresAt = new Date(storedToken.expires_at);
		
		console.log('Current time:', now.toISOString());
		console.log('Token expiration time:', expiresAt.toISOString());

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

		console.log('2FA verification successful for user:', user.id);

		return (reply.code(200).send({
			message: '2FA verification successful',
			user:
			{
				id: user.id,
				email: user.email
			},
			tokens:
			{
				accessToken: newTokens.accessToken,
				refreshToken: newTokens.refreshToken,
				expiration: newTokens.expiration
			}
		}));
	}
	catch (err)
	{
		console.log('2FA verification error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}

// TO DO, check if it works, shuld be called form user_profile service
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

		console.log('2FA activated for user:', updatedUser.id);

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
		console.log('Update 2FA settings error:', err.message);

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

		console.log('Password changed for user:', user.id);

		return (reply.code(200).send({ message: 'Password changed successfully' }));
	}
	catch (err)
	{
		console.log('Change password error:', err.message);

		return (reply.code(500).send({ error: 'Internal server error' }));
	}
}