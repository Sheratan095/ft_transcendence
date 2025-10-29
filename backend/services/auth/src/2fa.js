import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getExpirationDateByMinutes } from './auth-help.js';
import { getLanguagePack } from './email-templates/language-packs.js';

const	__filename = fileURLToPath(import.meta.url);
const	__dirname = path.dirname(__filename);

export async function	sendTwoFactorCode(user, language, authDb, reply)
{
	const	otp_code = generateOTPCode();
	const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

	const	expirationDate = getExpirationDateByMinutes(process.env.OTP_EXPIRATION_MINUTES);

	await (authDb.storeTwoFactorToken(user.id, hash_optcode, expirationDate));

	await sendOTPEmail(
		user.email,
		otp_code,
		language,
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

export async function	sendOTPEmail(to, otpCode, language, expiryMinutes = 10)
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

	// Get language pack for the specified language
	const	langPack = getLanguagePack(language);

	// Generate HTML content using single template and language pack
	let	htmlContent;
	try
	{
		// Use the single template file
		const	templatePath = path.join(__dirname, 'email-templates', 'otp-template.html');
		const	htmlTemplate = fs.readFileSync(templatePath, 'utf8');
		
		// Generate security points HTML
		const	securityPointsHtml = langPack.securityPoints
			.map(point => `<li>${point.replace(/{{EXPIRY_MINUTES}}/g, expiryMinutes)}</li>`)
			.join('');
		
		// Replace all placeholders with language pack values and dynamic content
		htmlContent = htmlTemplate
			.replace(/{{LANGUAGE}}/g, language)
			.replace(/{{TITLE}}/g, langPack.title)
			.replace(/{{GREETING}}/g, langPack.greeting)
			.replace(/{{MESSAGE}}/g, langPack.message)
			.replace(/{{OTP_LABEL}}/g, langPack.otpLabel)
			.replace(/{{OTP_CODE}}/g, otpCode)
			.replace(/{{EXPIRY_TEXT}}/g, langPack.expiryText.replace(/{{EXPIRY_MINUTES}}/g, expiryMinutes))
			.replace(/{{SECURITY_TITLE}}/g, langPack.securityTitle)
			.replace(/{{SECURITY_POINTS}}/g, securityPointsHtml)
			.replace(/{{FOOTER_MESSAGE}}/g, langPack.footerMessage)
			.replace(/{{FOOTER_TEXT}}/g, langPack.footerText);
	} 
	catch (error)
	{
		console.error('❌ Error loading email template:', error.message);
	}

	const	mailOptions =
	{
		from: `"42 ft_transcendence" <${process.env.SMTP_USER}>`,
		to,
		subject: langPack.subject,
		text: langPack.plainText
			.replace(/{{OTP_CODE}}/g, otpCode)
			.replace(/{{EXPIRY_MINUTES}}/g, expiryMinutes),
		html: htmlContent
	};

	try
	{
		await transporter.sendMail(mailOptions);

		console.log(`📧 Modern 2FA Email sent to ${to}, expires in ${expiryMinutes} minutes`);
	}
	catch (error)
	{
		console.error("❌ Error sending OTP email:", error.message);

		throw (error);
	}
}
