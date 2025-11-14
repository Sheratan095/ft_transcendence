# HTTP Status Codes Reference - Authentication Service

## ✅ Current Status Codes (Corrected)

### Success Codes (2xx)

| Code | Name | Usage | Endpoints |
|------|------|-------|-----------|
| **200** | OK | Successful operation | login, logout, validateToken, token |
| **201** | Created | Resource successfully created | register |

---

### Client Error Codes (4xx)

| Code | Name | Usage | When to Use |
|------|------|-------|-------------|
| **400** | Bad Request | Invalid request format/validation errors | register (validation failures) |
| **401** | Unauthorized | Authentication failed or invalid credentials | login (wrong password), logout, validateToken, token |
| **404** | Not Found | The resource requested doesn't exist
| **409** | Conflict | Resource already exists | register (username/email exists) |

---

### Server Error Codes (5xx)

| Code | Name | Usage | When to Use |
|------|------|-------|-------------|
| **500** | Internal Server Error | Unexpected server errors | All endpoints (unexpected errors) |

---

## 📋 Endpoint-by-Endpoint Breakdown

### POST /register
**Purpose:** Create a new user account

| Status | Scenario | Response |
|--------|----------|----------|
| **201** | User successfully created | `{ message, user, tokens }` |
| **400** | Validation error (weak password, invalid email, etc.) | `{ error: "validation message" }` |
| **409** | Username already exists | `{ error: "Username already exists" }` |
| **409** | Email already exists | `{ error: "Email already exists" }` |
| **500** | Database or server error | `{ error: "Internal server error" }` |

**Example:**
```javascript
// Success
201 { message: "User registered successfully", user: {...}, tokens: {...} }

// Username taken
409 { error: "Username already exists" }

// Weak password
400 { error: "Password is too common." }
```

---

### POST /login
**Purpose:** Authenticate existing user

| Status | Scenario | Response |
|--------|----------|----------|
| **200** | Login successful | `{ message, user, tokens }` |
| **401** | User not found | `{ error: "Invalid credentials" }` |
| **401** | Wrong password | `{ error: "Invalid credentials" }` |
| **500** | Database or server error | `{ error: "Internal server error" }` |

**Example:**
```javascript
// Success
200 { message: "Login successful", user: {...}, tokens: {...} }

// Failed login (intentionally vague for security)
401 { error: "Invalid credentials" }
```

**Note:** Don't reveal whether username or password is wrong - always use generic "Invalid credentials"

---

### DELETE /logout
**Purpose:** Invalidate user's refresh token

| Status | Scenario | Response |
|--------|----------|----------|
| **200** | Logout successful | `{ message: "Logged out successfully" }` |
| **401** | Token expired | `{ error: "Token has expired" }` |
| **401** | Invalid token signature | `{ error: "Invalid token" }` |
| **401** | Token not found in DB | `{ error: "Refresh token not found or already invalidated" }` |
| **500** | Database or server error | `{ error: "Internal server error" }` |

**Example:**
```javascript
// Success
200 { message: "Logged out successfully" }

// Token already used/revoked
401 { error: "Refresh token not found or already invalidated" }
```

---

### POST /validate-token
**Purpose:** Verify access token validity (internal use by gateway)

| Status | Scenario | Response |
|--------|----------|----------|
| **200** | Token is valid | `{ message, valid: true, user }` |
| **401** | Token expired | `{ error: "Token has expired" }` |
| **401** | Invalid token | `{ error: "Invalid token" }` |
| **500** | Server error | `{ error: "Internal server error" }` |

**Example:**
```javascript
// Valid token
200 { message: "Token is valid", valid: true, user: { id, email } }

// Expired token
401 { error: "Token has expired" }
```

---

### POST /token
**Purpose:** Refresh access token using refresh token

| Status | Scenario | Response |
|--------|----------|----------|
| **200** | New tokens generated | `{ message, tokens }` |
| **401** | Refresh token expired (JWT) | `{ error: "Token has expired" }` |
| **401** | Invalid refresh token signature | `{ error: "Invalid token" }` |
| **401** | Token not found in DB | `{ error: "Refresh token not found or revoked" }` |
| **401** | Token expired in DB | `{ error: "Refresh token has expired" }` |
| **500** | Database or server error | `{ error: "Internal server error" }` |

**Example:**
```javascript
// Success
200 { message: "New tokens generated successfully", tokens: {...} }

// Token revoked/not found
401 { error: "Refresh token not found or revoked" }
```

---

## 🎯 HTTP Status Code Best Practices

### ✅ DO:

1. **Use Standard Codes**
   - Stick to well-known HTTP status codes
   - Avoid custom/non-standard codes like 498

2. **Be Consistent**
   - Same type of error = same status code across all endpoints
   - Authentication failures = 401
   - Validation failures = 400
   - Resource conflicts = 409

3. **Security First**
   - Don't reveal if username exists during login (use 401, not 404)
   - Use generic "Invalid credentials" messages
   - Same response time for valid/invalid usernames (prevent timing attacks)

4. **Client-Friendly**
   - Include descriptive error messages
   - Use appropriate status codes for proper client handling
   - Document all possible status codes in schema

### ❌ DON'T:

1. **Don't Use Non-Standard Codes**
   ```javascript
   // ❌ BAD - 498 is nginx-specific
   return reply.code(498).send({ error: "Invalid token" });
   
   // ✅ GOOD - 401 is standard
   return reply.code(401).send({ error: "Invalid token" });
   ```

2. **Don't Reveal Too Much Information**
   ```javascript
   // ❌ BAD - Reveals if username exists
   return reply.code(404).send({ error: "Username not found" });
   
   // ✅ GOOD - Generic message
   return reply.code(401).send({ error: "Invalid credentials" });
   ```

3. **Don't Use Wrong Semantic Codes**
   ```javascript
   // ❌ BAD - 200 for errors
   return reply.code(200).send({ error: "Something went wrong" });
   
   // ✅ GOOD - Appropriate error code
   return reply.code(500).send({ error: "Internal server error" });
   ```

---

## 📊 HTTP Status Code Categories

### 2xx - Success
- Operation completed successfully
- Resource was created/modified/deleted as requested

### 4xx - Client Error
- Problem with the REQUEST (client's fault)
- Invalid data, missing authentication, etc.
- Client should modify request before retrying

### 5xx - Server Error
- Problem with the SERVER (server's fault)
- Database down, unexpected exception, etc.
- Client can retry without modification

---

## 🔍 Common HTTP Status Codes Reference

### Success (2xx)
| Code | Name | Meaning |
|------|------|---------|
| 200 | OK | Request successful |
| 201 | Created | New resource created |
| 204 | No Content | Successful, no response body |

### Client Errors (4xx)
| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| 400 | Bad Request | Invalid syntax/validation | Invalid email format |
| 401 | Unauthorized | Not authenticated | Wrong password, expired token |
| 403 | Forbidden | Authenticated but not authorized | User can't access admin resource |
| 404 | Not Found | Resource doesn't exist | Endpoint doesn't exist |
| 409 | Conflict | Resource conflict | Username already exists |
| 422 | Unprocessable Entity | Valid syntax but semantic error | Business logic validation |

### Server Errors (5xx)
| Code | Name | Meaning |
|------|------|---------|
| 500 | Internal Server Error | Unexpected error |
| 502 | Bad Gateway | Invalid response from upstream |
| 503 | Service Unavailable | Service temporarily down |

---

## ✅ Summary

Your status codes are now **correct and follow HTTP standards**:

1. ✅ Using standard codes (200, 201, 400, 401, 409, 500)
2. ✅ Removed non-standard 498 code
3. ✅ Added missing 400 to register schema
4. ✅ Consistent use across all endpoints
5. ✅ Security-conscious (generic error messages)

All endpoints properly document their status codes in the schema and implement them correctly in controllers!
