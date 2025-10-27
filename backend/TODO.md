[x] std_microservice_architecture.drawio
[x] remove guards from controllers, check if schema validation really works

[x] be sure to protect sql injection
[x] docs for microservice.db in std_microservice_architecture.drawio
[x] figure out how handle db in microservice and add it to std_microservice_architecture.drawio
[x] move the sql scripts to another .sql and execute it in ..._db 

[x] lowercase shit
[x] min length of username and psw (and other constraints)
[x] registration constaint, specify the errors returned by SQLITE_CONSTRAINT if user already exist, or the mail
[x] login with unknown user? => is ok to return "Invalid credentials"
[x] update standard_architetrure... with new Error response schema
[x] if email "daddas@.com": Auth service error: Request failed with status code 400
[x] login when a user is already logged? => just a new login (get new tokens)
[x] when the reply is 500 (internal server error) => the error message should be deleted
[x] add user id after jwt validation in gateway (added user data )
[] Cleanup job: periodically remove expired tokens from DB.
[x] check all status codes!!! 
[x] update std_microsercice_architecture with new routes schemas

[x] install swagger
[x] swagger aggregator really makes sense? : yes
[x] consider to remove api flow, and add some "tutorial" fro swagger
[] move swagger in another microservice?
[] swagger implementation.txt

[] how can we check if a user is online? last token request?

[x] JWT protocol
	[x] userId and email are critical credentials (CAN'T be changed), they are used to sign the JWT
	[x] add accessToken expiration to login and registration reply, add it also in auth_api_flow.drawio
	[x] new token request
	[x] solve /auth/token error

[] SQL INJECTION PROTECTION
[] XSS Attack

[x] move username handling in to the user_profile service, update the databases too
[] rename twoFactoruAuth in to 2FA where possible
[x] check for db decoration in auth.js/start()
[x] login doesn't work
[] delete user data? (GDPR)
	Don’t do the actual profile deletion inside the Auth service —
	let Auth trigger a system-wide cascade via events or APIs.
	Each service deletes what it owns.
[x] rename users table in auth
[x] check logout
[] normalize uppercase/lower case in schemas properties

[x] 2FA
	[x] Custom Otp mail
	[x] Change profile image to 42 account to diplay it in to the email
	[x] Update login route requiring 2fa

[] add welcome mail? add psw change or 2fa enabled mail notification?
[x] auth/update_user that can contain both boolean for 2fa and username change (will be called by users/update)
[x] add endpoint to change the psw
[x] should the language name depends on the preferred language of the user?
	[x] seprate the template and the "language pack"
[] add user/update-user, to change userame and language => test if than the mail are sent in the chosen language
[] rename files with dsadsa-sdada.js format
[] update db design for just id as pk

[x] Prevent brute force	Add rate limiting (login attempts)	Stop attackers guessing passwords
[x] Prevent spam registration	Throttle by IP, require CAPTCHA or email verification	Stop mass signups
[x] Prevent token spam	Add short cooldown (optional)	Avoid repeated login requests
	await fastify.register(import('fastify-rate-limit'), {
	max: 5, // requests
	timeWindow: '5 minutes', // time window
	keyGenerator: (req) => req.body.username || req.ip
	});