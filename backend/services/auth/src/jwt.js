import jwt from 'jsonwebtoken';
import { getExpirationDateByDays } from './auth-help.js';
import ms from 'ms'; // optional helper to convert "15m" -> milliseconds

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
	const	expiration = getExpirationDateByDays(process.env.REFRESH_TOKEN_EXPIRATION_DAYS);
	
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

// Helper to set auth cookies
export function	setAuthCookies(reply, newTokens)
{
	const	accessTokenMaxAge = ms(process.env.ACCESS_TOKEN_EXPIRATION) / 1000;
	const	refreshTokenMaxAge = parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS, 10) * 24 * 60 * 60;

	reply.setCookie('accessToken', newTokens.accessToken,
	{
		path: '/',
		httpOnly: true,
		secure: false, // For http TO DO set "true" in production with https
		sameSite: 'none', // Frontend and backend are on different domains
		maxAge: accessTokenMaxAge
	});

	reply.setCookie('refreshToken', newTokens.refreshToken,
	{
		path: '/',
		httpOnly: true,
		secure: false, // For http TO DO set "true" in production with https
		sameSite: 'none', // Frontend and backend are on different domains
		maxAge: refreshTokenMaxAge
	});
}