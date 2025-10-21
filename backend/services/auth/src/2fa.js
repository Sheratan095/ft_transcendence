import nodemailer from "nodemailer";
import bcrypt from 'bcrypt';

export const	sendTwoFactorCode = async (user, authDb, reply) =>
{
	const	otp_code = generateOTPCode();
	const	hash_optcode = bcrypt.hashSync(otp_code, parseInt(process.env.HASH_SALT_ROUNDS));

	await (authDb.storeTwoFactorToken(user.id, hash_optcode, process.env.OTP_EXPIRATION));

	// In a real-world application, you would send the OTP code via email or SMS.
	// Here, we'll just log it to the console for demonstration purposes.
	sendEmail(
		user.email,
		'Your Two-Factor Authentication Code',
		`Your OTP code is: ${otp_code}`
	);

	reply.code(200).send({ message: 'Two-Factor Authentication required', tfaRequired: true, userId: user.id })
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