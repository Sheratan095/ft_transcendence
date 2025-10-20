# SQL Injection Prevention Guide

## ✅ Current Security Measures

### 1. **Parameterized Queries (PRIMARY DEFENSE)**
Your code uses parameterized queries throughout, which is the **most important** defense:

```javascript
// ✅ SAFE - Parameters are properly escaped
await this.db.get("SELECT * FROM users WHERE username = ?", [username]);
await this.db.run("INSERT INTO users (id, username, password, email) VALUES (?, ?, ?, ?)", 
    [id, username, password, email]);
```

**Why it works:**
- User input never gets concatenated into SQL strings
- Database driver handles escaping automatically
- Malicious SQL code is treated as data, not commands

### 2. **Input Validation & Sanitization**
Enhanced validation checks:
- Username format validation (alphanumeric, 3-30 chars)
- Email format validation (RFC 5322)
- UUID format validation
- SQL keyword detection (defense in depth)
- Reserved word checking

### 3. **Password Security**
- Bcrypt hashing with salt rounds
- Password strength validation
- Protection against common passwords

### 4. **Authentication Security**
- JWT tokens for access control
- Refresh token rotation
- Token expiration handling

## 🛡️ Defense-in-Depth Layers

### Layer 1: Database (Primary)
✅ **Parameterized Queries** - Always use placeholders

### Layer 2: Application (Secondary)
✅ **Input Validation** - Validate format and content
✅ **Type Checking** - Ensure correct data types
✅ **Length Limits** - Enforce maximum lengths

### Layer 3: Database Configuration
- Use principle of least privilege
- Separate read/write permissions
- Enable query logging for auditing

## ⚠️ What NOT to Do

### ❌ NEVER do string concatenation:
```javascript
// ❌ VULNERABLE TO SQL INJECTION
const query = "SELECT * FROM users WHERE username = '" + username + "'";
await this.db.get(query);

// ❌ ALSO VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}'`;
await this.db.get(query);
```

**Attack example:**
If `username = "admin' OR '1'='1"`, the query becomes:
```sql
SELECT * FROM users WHERE username = 'admin' OR '1'='1'
-- This returns ALL users!
```

### ❌ NEVER trust client input:
```javascript
// ❌ DON'T trust without validation
const sortBy = req.query.sortBy; // Could be: "id; DROP TABLE users--"
const query = `SELECT * FROM users ORDER BY ${sortBy}`;
```

## 🔍 Additional Best Practices

### 1. **Rate Limiting**
Prevent brute force attacks:
```javascript
// In your auth service
await fastify.register(import('@fastify/rate-limit'), {
   max: 5,
   timeWindow: '5 minutes',
   keyGenerator: (req) => req.body.username || req.ip
});
```

### 2. **Database User Permissions**
Create dedicated DB users with minimal permissions:
```sql
-- Create read-only user for queries
CREATE USER 'app_read'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT ON database.* TO 'app_read'@'localhost';

-- Create limited write user
CREATE USER 'app_write'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE ON database.users TO 'app_write'@'localhost';
```

### 3. **Query Logging & Monitoring**
Enable SQLite logging in development:
```javascript
this.db.on('trace', (sql) => {
    console.log('[SQL]', sql);
});
```

### 4. **Error Handling**
Don't expose database errors to clients:
```javascript
// ✅ GOOD - Generic error message
catch (err) {
    console.error('Database error:', err); // Log details internally
    return reply.code(500).send({ error: 'Internal server error' });
}

// ❌ BAD - Exposes database structure
catch (err) {
    return reply.code(500).send({ error: err.message });
}
```

### 5. **Content Security**
For any dynamic SQL parts (like ORDER BY), use whitelisting:
```javascript
const allowedSortFields = ['username', 'email', 'created_at'];
const sortBy = req.query.sortBy;

if (!allowedSortFields.includes(sortBy)) {
    throw new Error('Invalid sort field');
}

// Now safe to use in query
const query = `SELECT * FROM users ORDER BY ${sortBy}`;
```

## 📊 Security Checklist

- [x] Use parameterized queries everywhere
- [x] Validate input format (email, username, UUID)
- [x] Check for SQL keywords (defense in depth)
- [x] Hash passwords with bcrypt
- [x] Implement JWT authentication
- [ ] Add rate limiting (recommended)
- [ ] Set up database user permissions (if using multi-user DB)
- [ ] Enable query logging for auditing
- [ ] Regular security audits
- [ ] Keep dependencies updated

## 🔗 Resources

- [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
- [SQLite Security Checklist](https://www.sqlite.org/security.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 🎯 Summary

Your current implementation is **already well-protected** against SQL injection thanks to:
1. ✅ Consistent use of parameterized queries
2. ✅ Input validation
3. ✅ Password hashing
4. ✅ Secure authentication flow

The additional layers we've added provide **defense in depth** - multiple security layers so if one fails, others still protect you.
