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
[x] check all status codes!!! 
[x] update std_microsercice_architecture with new routes schemas

[x] install swagger
[x] swagger aggregator really makes sense? : yes
[x] consider to remove api flow, and add some "tutorial" fro swagger
[x] move swagger in another microservice? added security layer with username and password 
[x] swagger implementation.txt
[x] swagger refresh
[x] check ...withAuthCookies and updated the std mic architecture

[x] JWT protocol
	[x] userId and email are critical credentials (CAN'T be changed), they are used to sign the JWT
	[x] add accessToken expiration to login and registration reply, add it also in auth_api_flow.drawio
	[x] new token request
	[x] solve /auth/token error
	[x] must be in the http only cockies (XSS attack)

[] SQL INJECTION PROTECTION
[] XSS Attack

[x] registration with an existing username
	CreateUser error: SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username
	Error creating user profile: Request failed with status code 500
	User registered:  13da28ca-1497-4486-9637-2b1214abdd51

[x] move username handling in to the user_profile service, update the databases too
[x] rename twoFactoruAuth in to 2FA where possible
[x] check for db decoration in auth.js/start()
[x] login doesn't work
[x] rename users table in auth
[x] check logout
[x] normalize uppercase/lower case in schemas properties
[x] add mail in to user search reply
[x] fix problem with search by username

[x] 2FA
	[x] Custom Otp mail
	[x] Change profile image to 42 account to diplay it in to the email
	[x] Update login route requiring 2fa

[x] add welcome mail? add psw change or 2fa enabled mail notification?
[x] auth/update_user that can contain both boolean for 2fa and username change (will be called by users/update)
[x] add endpoint to change the psw
[x] should the language name depends on the preferred language of the user?
	[x] seprate the template and the "language pack"
[x] add user/update-user, to change userame and language => test if than the mail are sent in the chosen language
[x] rename files with dsadsa-sdada.js format (kebab-case)
[x] update db design for just id as pk

[x] Prevent brute force	Add rate limiting (login attempts)	Stop attackers guessing passwords
[x] Prevent spam registration	Throttle by IP, require CAPTCHA or email verification	Stop mass signups
[x] Prevent token spam	Add short cooldown (optional)	Avoid repeated login requests
	await fastify.register(import('fastify-rate-limit'), {
	max: 5, // requests
	timeWindow: '5 minutes', // time window
	keyGenerator: (req) => req.body.username || req.ip
	});

[x] change checkForEnvVars and display all the missing vars
[x] add checks on user existing and token expiration directly in gatewat jwt validation
[x] how can we check if a user is online? : ping on websocket notification service
[] Cleanup job: periodically remove expired tokens from DB.

[x] register MAA => error

[x] FIX THIS
	(node:12179) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
	at common.setupOutgoing (/home/maceccar/Desktop/ft_transcendence/backend/gateway/node_modules/http-proxy/lib/http-proxy/common.js:43:22)
	at Array.stream (/home/maceccar/Desktop/ft_transcendence/backend/gateway/node_modules/http-proxy/lib/http-proxy/passes/ws-incoming.js:104:14)
	at ProxyServer.<anonymous> (/home/maceccar/Desktop/ft_transcendence/backend/gateway/node_modules/http-proxy/lib/http-proxy/index.js:81:21)
	at handleSocketUpgrade (file:///home/maceccar/Desktop/ft_transcendence/backend/gateway/src/routes/notification-routes.js:77:9)
	at process.processTicksAndRejections (node:internal/process/task_queues:105:5]

[x]	Registration error - Code: undefined, Message: Password is too similar to username or email.
	Auth service error: Request failed with status code 500

[x] Refactor of users research (by email directly in auth?) - (by username in ?)
[x] Fix it
	[AUTH] Registration error: SQLITE_CONSTRAINT: UNIQUE constraint failed: auth_accounts.email
	Duplicate email attempt
	[GATEWAY] Auth service error: Request failed with status code 409

[x] add user/... to all relationships routes in gateway registrations
[x] refactor of backend_design

[x] move email send in to notification service (endpoing called by auth service during login)
[x] "real friends online" instead of all online users

[x] refactor of all db's like chat db (indenting, "type_like" enums)
[x] dark swagger ui 

I think it's ok
[x]	When frontend doesn't implement http only cookies, try to change message
	[AUTH] User logged in:  1
	[AUTH] Token validation error: Invalid token

[x] When try to send a message or add a person to group, if you blocked him, return an error
	with message "unblock user to send a message" and noting when he blocked you

[x] Normalize date type
[x] Leave group
[x] rework of user-specific messages in group chat to add the username
[x] should the user stats row be created at user registration? i think so
	-> user deletion

[x] Explain date formats differences in docs (specially function formatDate)
	and check all of db and microservice-db.js for sql injection or other shit around

[x] Add ws docs in std-microservice architecture

[] add a "starting script" that generate the env, install packages and create the certificates(they shouldn't be posted in the repo)

[x] delete user data? (GDPR)
	Don’t do the actual profile deletion inside the Auth service —
	let Auth trigger a system-wide cascade via events or APIs.
	Each service deletes what it owns.

[x] Rename/move ws routes in gateway

[x] check env, required and check for required env in all services

[] Create a matchmaking system to allow users to find opponents and participate
	in FAIR AND BALANCED MATCHES
	two players "blocked" can find each other?? now they can't

[x] Check block before inviting in a custom game 

[x] Pong User stats aren't up to date, also for tournaments

[x] Is busy has to be done in both games and tournaments

[x] When updating profile image with a non supported extension
	[GATEWAY] Users service error: Request failed with status code 400

[x] Can creator cancel the tournament

[x] 2fa not working

[x] pong get user stats