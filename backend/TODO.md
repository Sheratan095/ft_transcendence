[x] std_microservice_architecture.drawio
[] docs for microservice.db in std_microservice_architecture.drawio
[] figure out how handle db in microservice and add it to std_microservice_architecture.drawio
[x] move the sql scripts to another .sql and execute it in ..._db 
[] remove guards from controllers, check if schema validation really works

[x] lowercase shit
[x] min length of username and psw (and other constraints)
[x] registration constaint, specify the errors returned by SQLITE_CONSTRAINT if user already exist, or the mail
[x] login with unknown user? => is ok to return "Invalid credentials"
[] update standard_architetrure... with new Error response schema
[x] if email "daddas@.com": Auth service error: Request failed with status code 400
[] move swagger in another microservice?
[x] login when a user is already logged? => just a new login (get new tokens)
[x] when the reply is 500 (internal server error) => the error message should be deleted
[x] add user id after jwt validation in gateway (added user data )
[] Cleanup job: periodically remove expired tokens from DB.

[x] install swagger
[x] swagger aggregator really makes sense? : yes
[] check all status codes!!! 
[x] update std_microsercice_architecture with new routes schemas
[x] consider to remove api flow, and add some "tutorial" fro swagger
[] swagger implementation.txt

[] how can we check if a user is online? last token request?

[] JWT protocol
	[x] userId and email are critical credentials (CAN'T be changed), they are used to sign the JWT
	[x] add accessToken expiration to login and registration reply, add it also in auth_api_flow.drawio
	[x] new token request
	[x] solve /auth/token error

[] SQL INJECTION PROTECTION
[] XSS Attack