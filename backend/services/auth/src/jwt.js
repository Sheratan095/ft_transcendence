import jwt from 'jsonwebtoken';

export const decodeToken = (token, secret) =>
{
	try
	{
		return (jwt.verify(token, secret));
	}
	catch (err)
	{
		if (err.name === 'TokenExpiredError')
		{
			const	error = new Error('Token has expired');
			error.name = 'TokenExpiredError';
			error.expiredAt = err.expiredAt;
			throw (error);
		}
		else if (err.name === 'JsonWebTokenError')
		{
			const	error = new Error('Invalid token');
			error.name = 'JsonWebTokenError';
			throw (error);
		}
		else if (err.name === 'NotBeforeError')
		{
			const	error = new Error('Token not active yet');
			error.name = 'NotBeforeError';
			throw (error);
		}
		else
		{
			throw (err);
		}
	}
}

export async function	generateNewTokens(user, authDb)
{
	const	userPayload = { id: user.id, email: user.email };
	const	accessToken = generateAccessToken(userPayload);
	
	// Calculate expiration date
	const	expiration = getExpirationDate(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);
	
	// Generate refresh token WITH expiration
	const	refreshToken = jwt.sign(
		userPayload, 
		process.env.REFRESH_TOKEN_SECRET,
		{ expiresIn: `${process.env.REFRESH_TOKEN_EXPIRATION_DAYS}d` }
	);

	// Check if user already has a refresh token
	const	existingToken = await authDb.getRefreshTokenByUserId(user.id);
	
	if (existingToken) // Update existing token (token rotation)
		await authDb.updateRefreshToken(user.id, refreshToken, expiration);
	else	// Insert new token (first time login)
		await authDb.insertRefreshToken(user.id, refreshToken, expiration);

	return { accessToken, refreshToken, expiration };
}

export function	generateAccessToken(user)
{
	return (jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION}));
}
