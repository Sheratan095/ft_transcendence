import bcrypt from 'bcrypt';
import { getExpirationDateByMinutes } from './auth-help.js';
import axios from 'axios';

export async function	sendTwoFactorCode(user, language, authDb, reply)
{
	try
	{
		const	otp_code = generateOTPCode();
		const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

		const	expirationDate = getExpirationDateByMinutes(process.env.OTP_EXPIRATION_MINUTES);

		await (authDb.storeTwoFactorToken(user.id, hash_optcode, expirationDate));

		await axios.post(`${process.env.NOTIFICATION_SERVICE_URL}/send-2fa-code`, {
			email: user.email,
			otpCode: otp_code,
			language: language,
			expiryMinutes: process.env.OTP_EXPIRATION_MINUTES,
			},
			{ headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY } }
		);

		const	response = { message: 'Two-Factor Authentication required', tfaRequired: true, userId: user.id };
		
		reply.code(200).send(response);
	}
	catch (error)
	{
		console.error('Error in sendTwoFactorCode:', error);
		reply.code(500).send({ error: 'Failed to send Two-Factor Authentication code' });
	}

}

export function	generateOTPCode()
{
	// Generate a 6-digit random OTP code
	return (Math.floor(100000 + Math.random() * 900000).toString());
}
