[x] std_microservice_architecture.drawio
[] docs for microservice.db in std_microservice_architecture.drawio
[] figure out how handle db in microservice and add it to std_microservice_architecture.drawio
[] how can we check if a user is online? last token request?
[] move the sql scripts to another .sql and execute it in ..._db 
[] remove guards from controllers, check if schema validation really works

[] min length of username and psw (and other constraints)
[] registration constaint, specify the errors returned by SQLITE_CONSTRAINT if user already exist, or the mail
[] login with unknown user? 
[] update standard_architetrure... with new Error response schema
[x] if email "daddas@.com": Auth service error: Request failed with status code 400
[] move swagger in another microservice?
[] login when a user is already logged?
[x] when the reply is 500 (internal server error) => the error message should be deleted
[x] add user id after jwt validation in gateway (added user data )
[] Cleanup job: periodically remove expired tokens from DB.

[x] install swagger
[x] swagger aggregator really makes sense? : yes
[] check all status codes!!! 
[x] update std_microsercice_architecture with new routes schemas
[x] consider to remove api flow, and add some "tutorial" fro swagger
[] swagger implementation.txt

[] JWT protocol
	[] choose what to use as other credential, if mail or username, i suggest both
	[] add accessToken expiration to login and registration reply, add it also in auth_api_flow.drawio
	[] new token request