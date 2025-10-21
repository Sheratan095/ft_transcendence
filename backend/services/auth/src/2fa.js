import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';
import { getExpirationDateByMinutes } from './auth_help.js';

export async function	sendTwoFactorCode(user, authDb, reply)
{
	const	otp_code = generateOTPCode();
	const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

	const	expirationDate = getExpirationDateByMinutes(process.env.OTP_EXPIRATION_MINUTES);

	await (authDb.storeTwoFactorToken(user.id, hash_optcode, expirationDate));

	sendEmail(
		user.email,
		'Your Two-Factor Authentication Code',
		`Your OTP code is: ${otp_code}`
	);

	const	response = { message: 'Two-Factor Authentication required', tfaRequired: true, userId: user.id };
	
	reply.code(200).send(response);
}

export function	generateOTPCode()
{
	// Generate a 6-digit random OTP code
	return (Math.floor(100000 + Math.random() * 900000).toString());
}

export async function	sendEmail(to, subject, text)
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