# SOP: Troubleshooting Common Payload CMS Issues

**Purpose**: Quick reference for diagnosing and fixing common development issues.

**When to Use**: When encountering errors, warnings, or unexpected behaviour during development.

---

## Development Server Issues

### Issue: Port 3000 Already in Use

**Symptoms**:

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions**:

1. **Find and kill the process**:

   ```bash
   # Find process using port 3000
   lsof -i :3000

   # Kill the process
   kill -9 <PID>
   ```

2. **Use a different port**:
   ```bash
   PORT=3001 npm run dev
   ```

---

### Issue: "PayloadComponent not found in importMap"

**Symptoms**:

```
⚠ Warning: getFromImportMap: PayloadComponent not found in importMap
   You may need to run the `payload generate:importmap` command
```

**Solutions**:

1. **Regenerate import map**:

   ```bash
   npm run generate:importmap
   ```

2. **Clean restart**:

   ```bash
   npm run devsafe  # Deletes .next cache
   ```

3. **Verify component paths** match Payload conventions

---

### Issue: TypeScript Errors After Collection Changes

**Symptoms**:

```
Property 'newField' does not exist on type 'Book'
```

**Solutions**:

1. **Regenerate types**:

   ```bash
   npm run generate:types
   ```

2. **Force regeneration**:

   ```bash
   rm src/payload-types.ts
   npm run generate:types
   ```

3. **Restart TypeScript server** in your IDE

---

## Database Issues

### Issue: Database Locked

**Symptoms**:

```
SqliteError: database is locked
```

**Solutions**:

1. **Close database clients**:
   - Close any database browsers (DB Browser for SQLite, etc.)
   - Stop any other processes accessing the database

2. **Delete lock files**:

   ```bash
   rm infoshop.db-shm infoshop.db-wal
   npm run dev
   ```

3. **Last resort - recreate database**:
   ```bash
   rm infoshop.db*
   npm run dev  # Database will be recreated
   ```

**Warning**: Deleting the database will lose all data!

---

### Issue: Database Schema Out of Sync

**Symptoms**:

```
Error: no such table: books
```

**Solutions**:

1. **Let Payload regenerate schema**:

   ```bash
   rm infoshop.db*
   npm run dev
   ```

2. **Check collection is registered** in `src/payload.config.ts`

---

## Build and Cache Issues

### Issue: Stale Build Cache

**Symptoms**:

- Changes not reflecting in UI
- Old code still running
- Unexpected errors after updates

**Solutions**:

1. **Clean start**:

   ```bash
   npm run devsafe  # Deletes .next folder
   ```

2. **Full clean**:

   ```bash
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

3. **Clear browser cache**:
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Open DevTools → Network tab → Disable cache

---

### Issue: Module Not Found

**Symptoms**:

```
Error: Cannot find module '@payloadcms/next'
```

**Solutions**:

1. **Reinstall dependencies**:

   ```bash
   npm install
   ```

2. **Check package.json** for correct versions

3. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## API and Authentication Issues

### Issue: 401 Unauthorized

**Symptoms**:

```
{ "errors": [{ "message": "You are not allowed to perform this action." }] }
```

**Solutions**:

1. **Check authentication**:
   - Ensure JWT token is valid
   - Verify token is included in Authorization header:
     ```
     Authorization: JWT your-token-here
     ```

2. **Check access control** in collection config:

   ```typescript
   access: {
     create: ({ req: { user } }) => !!user,  // Requires authentication
   }
   ```

3. **Login again** to get fresh token:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@example.com", "password": "password"}'
   ```

---

### Issue: Relationship Fields Not Populating

**Symptoms**:

- Relationship field returns ID string instead of full object
- Missing related data

**Solutions**:

1. **Use depth parameter**:

   ```bash
   GET /api/books/:id?depth=1   # Populate one level
   GET /api/books/:id?depth=2   # Populate two levels
   ```

2. **Check relationship configuration**:
   ```typescript
   {
     name: 'category',
     type: 'relationship',
     relationTo: 'categories',  // Must match collection slug
   }
   ```

---

## Email and Storage Issues

### Issue: "No email adapter provided" Warning

**Symptoms**:

```
WARN: No email adapter provided. Email will be written to console.
```

**Solution**:

This is **normal in development**. Emails are logged to console instead of being sent.

For production, configure email adapter in `src/payload.config.ts`:

```typescript
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

export default buildConfig({
  email: nodemailerAdapter({
    defaultFromAddress: 'noreply@example.com',
    defaultFromName: 'Infoshop',
    transport: {
      host: process.env.SMTP_HOST,
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  }),
})
```

---

### Issue: File Uploads Not Working

**Symptoms**:

- Upload button doesn't work
- Files not saving
- Missing images

**Solutions**:

1. **Check media directory exists**:

   ```bash
   mkdir -p media
   ```

2. **Verify upload collection** is configured in `src/collections/Media.ts`

3. **Check disk space** on development machine

4. **Ensure proper permissions**:
   ```bash
   chmod -R 755 media/
   ```

---

## Performance Issues

### Issue: Slow Admin UI Loading

**Solutions**:

1. **Reduce relationship depth** in queries

2. **Add pagination** to large collections:

   ```typescript
   admin: {
     pagination: {
       defaultLimit: 10,
       limits: [10, 25, 50],
     },
   }
   ```

3. **Index frequently queried fields** (future: PostgreSQL indexes)

4. **Close unnecessary browser tabs** and DevTools

---

### Issue: Hot Reload Not Working

**Solutions**:

1. **Restart dev server**:

   ```bash
   # Ctrl+C to stop
   npm run dev
   ```

2. **Check file watchers**:

   ```bash
   # Linux: Increase file watch limit
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

3. **Close files** in other editors that might lock them

---

## Testing Issues

### Issue: Tests Failing After Collection Changes

**Solutions**:

1. **Regenerate types** before running tests:

   ```bash
   npm run generate:types
   npm test
   ```

2. **Clear test database**:

   ```bash
   rm test-*.db*  # If using separate test database
   npm test
   ```

3. **Check test configuration** in `vitest.config.mts` and `playwright.config.ts`

---

## Quality Hook Issues

### Issue: Hooks Failing with Exit Code 2

**Symptoms**:

```
❌ FORBIDDEN PATTERN: Found 'any' type
❌ FORBIDDEN PATTERN: Found 'console.log' in production code
```

**Solutions**:

1. **STOP IMMEDIATELY** - Do not continue with other tasks

2. **Fix ALL issues** - Address every ❌ until everything is ✅ GREEN:
   - Replace `any` with proper types
   - Remove `console.log` or use proper logging
   - Fix formatting issues

3. **Verify the fix**:

   ```bash
   npm run format  # Auto-fix formatting
   npm run lint    # Check for issues
   ```

4. **Continue original task** after all checks pass

**Remember**: There are NO warnings, only requirements!

---

## Environment Variable Issues

### Issue: Environment Variables Not Loading

**Symptoms**:

- `process.env.VARIABLE_NAME` is undefined
- Configuration not working

**Solutions**:

1. **Check .env.local exists**:

   ```bash
   ls -la .env*
   # Should show .env.local
   ```

2. **Verify variable names**:
   - No typos
   - Correct casing
   - No spaces around `=`

3. **Restart dev server** after changing .env files

4. **Check Next.js variable prefixes**:
   - Server variables: `VARIABLE_NAME`
   - Client variables: `NEXT_PUBLIC_VARIABLE_NAME`

---

## When All Else Fails

### Nuclear Option: Complete Reset

```bash
# 1. Stop dev server
# Ctrl+C

# 2. Delete all build artifacts and dependencies
rm -rf .next node_modules package-lock.json

# 3. Delete database (WARNING: loses all data)
rm infoshop.db*

# 4. Reinstall dependencies
npm install

# 5. Regenerate types and import map
npm run generate:types
npm run generate:importmap

# 6. Start fresh
npm run dev
```

---

## Getting Help

If none of these solutions work:

1. **Check Payload docs**: https://payloadcms.com/docs
2. **Search Payload Discord**: https://discord.com/invite/payload
3. **Check GitHub issues**: https://github.com/payloadcms/payload/issues
4. **Review `.agent/` documentation** for project-specific patterns
5. **Ask the team** with specific error messages and steps to reproduce

---

## Diagnostic Commands

Quick diagnostic checklist:

```bash
# Check Node version (should be ^18.20.2 || >=20.9.0)
node --version

# Check npm version
npm --version

# Check for process on port 3000
lsof -i :3000

# Check disk space
df -h

# Check file permissions
ls -la

# Check environment variables loaded
npm run dev | grep -i "env"

# Check database exists
ls -la *.db*

# Check TypeScript compilation
npx tsc --noEmit

# Check for dependency issues
npm ls --depth=0
```

---

Last Updated: 2025-11-01
