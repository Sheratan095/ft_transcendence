import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';
import { formatExpirationDate } from './auth_help.js';

export const	sendTwoFactorCode = async (user, authDb, reply) =>
{
	const	otp_code = generateOTPCode();
	const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

	// Calculate proper expiration date (configurable time from now)
	let expirationMillis;
	const otpExpiration = process.env.OTP_EXPIRATION || '1m';
	
	if (otpExpiration.endsWith('s')) {
		expirationMillis = parseInt(otpExpiration.replace('s', '')) * 1000;
	} else if (otpExpiration.endsWith('m')) {
		expirationMillis = parseInt(otpExpiration.replace('m', '')) * 60 * 1000;
	} else {
		expirationMillis = 60 * 1000; // default 1 minute
	}
	
	const	expirationDate = new Date(Date.now() + expirationMillis);
	const	formattedExpiration = expirationDate.toISOString(); // Keep ISO format with timezone

	await (authDb.storeTwoFactorToken(user.id, hash_optcode, formattedExpiration));

	// In a real-world application, you would send the OTP code via email or SMS.
	// Here, we'll just log it to the console for demonstration purposes.
	sendEmail(
		user.email,
		'Your Two-Factor Authentication Code',
		`Your OTP code is: ${otp_code}`
	);

	const response = { message: 'Two-Factor Authentication required', tfaRequired: true, userId: user.id };
	
	reply.code(200).send(response);
}

export const	generateOTPCode = () =>
{
	// Generate a 6-digit random OTP code
	return (Math.floor(100000 + Math.random() * 900000).toString());
}

export async function sendEmail(to, subject, text)
{
	const	transporter = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: process.env.SMTP_PORT,
		secure: false, // true for 465, false for 587
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS
		}
	});

	const	mailOptions =
	{
		from: `"ft_transcendence" <${process.env.SMTP_USER}>`,
		to,
		subject,
		text
	};

	try
	{
		await transporter.sendMail(mailOptions);

		console.log(`📧 2FA Email sent to ${to}`);
	}
	catch (error)
	{
		console.error("❌ Error sending email:", error.message);

		throw (error);
	}
}