import nodemailer from "nodemailer";
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { getLanguagePack } from './email-templates/language-packs.js';
import axios from 'axios';

// Middleware to validate API key for inter-service communication
// This function checks for a valid API key in the request headers
//	this ensures that only internal services can access protected endpoints
export async function	validateInternalApiKey(request, socket)
{
	const	apiKey = request.headers['x-internal-api-key'];
	// Validate the forwarded internal key matches our environment variable.
	if (!process.env.INTERNAL_API_KEY || apiKey !== process.env.INTERNAL_API_KEY)
	{
		console.log('[NOTIFICATION] Missing or invalid internal API key');

		// For WebSocket connections, socket is already upgraded - just close it
		if (socket)
		{
			try { socket.close(1008, 'Unauthorized'); } catch (e) {}
		}

		return (false);
	}

	return (true);
}

export function	checkEnvVariables(requiredEnvVars)
{
	let	missingEnvVarsCount = 0;

	for (const envVar of requiredEnvVars)
	{
		if (!process.env[envVar])
		{
			console.log(`Missing required environment variable: ${envVar}`);
			missingEnvVarsCount++;
		}
	}

	if (missingEnvVarsCount > 0)
		process.exit(1);
}

// Helper function to extract user data from gateway headers
// This function parses the user data passed from the gateway after JWT authentication
export function	extractUserData(request)
{
	try
	{
		if (request.headers['x-user-data'])
			return (JSON.parse(request.headers['x-user-data']));

		return (null);
	}
	catch (err)
	{
		console.log('[NOTIFICATION] Error parsing user data from headers:', err.message);
		return (null);
	}
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

	const	__filename = fileURLToPath(import.meta.url);
	const	__dirname = path.dirname(__filename);

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
		console.error('[NOTIFICATION] Error loading email template:', error.message);
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

		console.log(`[NOTIFICATION] 2FA Email sent to ${to}, expires in ${expiryMinutes} minutes`);
	}
	catch (error)
	{
		console.log(`[NOTIFICATION] Error sending OTP email: ${error.message}`);
		throw (error);
	}
}

export async function	getFriendsList(userId, onlineUserIds)
{
	try
	{
		const	response = await axios.get(`${process.env.USERS_SERVICE_URL}/relationships/friendsInternal`, {
			params: { userId },
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': process.env.INTERNAL_API_KEY
			}
		});

		// return only friends who are online
		const	filteredFriends = (response.data || []).filter(friend => onlineUserIds.includes(friend.userId));

		return (filteredFriends);
	}
	catch (error)
	{
		console.log(`[NOTIFICATION] Failed to fetch friends list for user ${userId}:`, error.message);
		return ([]);
	}
}

export async function	getUsernameById(userId)
{
	try
	{
		const	response = await fetch(`${process.env.USERS_SERVICE_URL}/username-by-id?userId=${userId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'x-internal-api-key': process.env.INTERNAL_API_KEY,
			},
		});

		if (!response.ok)
		{
			console.error(`[CHAT] Failed to fetch user data for Id ${userId}: ${response.statusText}`);
			return (null);
		}

		const	userData = await response.json();
		return (userData.username);
	}
	catch (error)
	{
		console.error(`[CHAT] Error fetching user data for Id ${userId}:`, error.message);
		return (null);
	}
}