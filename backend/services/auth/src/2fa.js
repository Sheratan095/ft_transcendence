import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getExpirationDateByMinutes } from './auth_help.js';

const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export async function	sendTwoFactorCode(user, authDb, reply)
{
	const	otp_code = generateOTPCode();
	const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

	const	expirationDate = getExpirationDateByMinutes(process.env.OTP_EXPIRATION_MINUTES);

	await (authDb.storeTwoFactorToken(user.id, hash_optcode, expirationDate));

	// Send modern HTML email with 42 styling
	await sendOTPEmail(
		user.email,
		otp_code,
		parseInt(process.env.OTP_EXPIRATION_MINUTES) || 10
	);

	const	response = { message: 'Two-Factor Authentication required', tfaRequired: true, userId: user.id };
	
	reply.code(200).send(response);
}

export function	generateOTPCode()
{
	// Generate a 6-digit random OTP code
	return (Math.floor(100000 + Math.random() * 900000).toString());
}

export async function	sendOTPEmail(to, otpCode, expiryMinutes = 10)
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

	// Generate HTML content by reading template and injecting OTP
	let	htmlContent;
	try
	{
		const	templatePath = path.join(__dirname, 'email_templates', 'otp_template.html');
		const	htmlTemplate = fs.readFileSync(templatePath, 'utf8');
		
		// Replace placeholders with actual values
		htmlContent = htmlTemplate
			.replace(/{{OTP_CODE}}/g, otpCode)
			.replace(/{{EXPIRY_MINUTES}}/g, expiryMinutes);
	} 
	catch (error)
	{
		console.error('❌ Error loading email template:', error.message);
	}

	const	mailOptions =
	{
		from: `"42 ft_transcendence" <${process.env.SMTP_USER}>`,
		to,
		subject: '🔐 Your 42 Authentication Code',
		text: `Your 42 Authentication Code is: ${otpCode}\nThis code will expire in ${expiryMinutes} minutes.`,
		html: htmlContent
	};

	try
	{
		await transporter.sendMail(mailOptions);

		console.log(`📧 Modern 2FA Email sent to ${to}`);
		console.log(`⏰ Code expires in ${expiryMinutes} minutes`);
	}
	catch (error)
	{
		console.error("❌ Error sending OTP email:", error.message);

		throw (error);
	}
}
