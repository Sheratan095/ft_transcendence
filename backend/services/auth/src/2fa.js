
export const	sendTwoFactorCode = async (userEmail, otp_code) =>
{
	// In a real-world application, you would send the OTP code via email or SMS.
	// Here, we'll just log it to the console for demonstration purposes.
	console.log(`Sending 2FA code to ${userEmail}: ${otp_code}`);
}

export const	generateOTPCode = () =>
{
	// Generate a 6-digit random OTP code
	return (Math.floor(100000 + Math.random() * 900000).toString());
}
