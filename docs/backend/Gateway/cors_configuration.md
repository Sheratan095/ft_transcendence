# CORS Configuration - Fixed

## What was the problem?

When trying to access the API from the browser (opening `index.html` directly or from a different origin), you got a "Failed to fetch" error. This was because:

1. **CORS (Cross-Origin Resource Sharing)** was not enabled on the gateway
2. Browsers block requests from one origin to another for security reasons
3. Without CORS headers, the browser refuses to make the request

## What was done?

### 1. Installed CORS plugin for Fastify
```bash
npm install @fastify/cors@^8.5.0
```
**Note:** Version `^8.5.0` is compatible with Fastify 4.x

### 2. Registered CORS in gateway.js
```javascript
import cors from '@fastify/cors';
await fastify.register(cors, {
  origin: '*'  // for testing only; restrict to your domain in production
});
```

## CORS Configuration Options

### Current (Development) - Allow All Origins
```javascript
await fastify.register(cors, {
  origin: '*'
});
```
✅ **Good for:** Development and testing
⚠️ **Warning:** NEVER use in production!

### Production - Specific Origins
```javascript
await fastify.register(cors, {
  origin: 'https://yourdomain.com',
  credentials: true
});
```

### Production - Multiple Origins
```javascript
await fastify.register(cors, {
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true
});
```

### Production - Dynamic Origin Validation
```javascript
await fastify.register(cors, {
  origin: (origin, callback) => {
    const allowedOrigins = ['https://yourdomain.com', 'https://app.yourdomain.com'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
});
```

## Testing Your Login Page

### 1. Make sure backend is running:
```bash
cd backend
make dev
```

### 2. Open the test page:

**Option A: Direct file access**
```
file:///path/to/index.html
```

**Option B: Simple HTTP server (recommended)**
```bash
# Python 3
python3 -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

Then visit: `http://localhost:8080`

### 3. Test the flow:

1. **Register** a new user:
   - Username: `testuser` (3-20 chars, letters/numbers/dots/underscores)
   - Email: `test@example.com`
   - Password: `Test123!@#` (8-24 chars, upper, lower, number, symbol)

2. **Login** with username or email

3. **Refresh Token** - Get a new access token

4. **Validate Token** - Check if access token is valid

5. **Logout** - Revoke the refresh token

## Common CORS Errors and Solutions

### Error: "Failed to fetch"
**Cause:** CORS not enabled or server not running
**Solution:** 
- Check if backend is running: `make status`
- Ensure CORS is registered in gateway.js

### Error: "No 'Access-Control-Allow-Origin' header"
**Cause:** CORS plugin not properly configured
**Solution:**
- Make sure `@fastify/cors` is installed
- Verify registration happens before routes

### Error: "CORS policy: Credentials flag is 'true'"
**Cause:** Using `credentials: true` with `origin: '*'`
**Solution:**
- In development: Remove `credentials: true` or use specific origin
- In production: Use specific allowed origins

## Security Best Practices

### Development
```javascript
// ✅ OK for development
await fastify.register(cors, {
  origin: '*'
});
```

### Production
```javascript
// ✅ Secure for production
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

### Environment-based Configuration
```javascript
// ✅ Best practice - different settings per environment
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  : {
      origin: '*'
    };

await fastify.register(cors, corsOptions);
```

## What's Next?

1. ✅ CORS is now enabled for development
2. ⚠️ Remember to restrict origins in production
3. 📝 Add environment variables for allowed origins
4. 🔒 Use HTTPS in production
5. 🧪 Test your authentication flow

## Additional Resources

- [Fastify CORS Plugin](https://github.com/fastify/fastify-cors)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [OWASP: CORS Security](https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny)
