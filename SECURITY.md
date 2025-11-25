# 🔐 SECURITY NOTICE

## ⚠️ Important: Protecting Your API Keys

This repository has been secured to prevent accidental exposure of sensitive API keys. Please follow these guidelines:

### ✅ DO:
- Use environment variables for all API keys and secrets
- Keep your `.env` file local and never commit it
- Use different API keys for development and production
- Regularly rotate your API keys
- Set environment variables in your deployment platform's dashboard

### ❌ DON'T:
- Hardcode API keys directly in source code
- Commit `.env` files to version control
- Share API keys in chat, email, or documentation
- Use production keys in development
- Leave debug logs with sensitive information

### 🛡️ Environment Variables Used:
- `NEXT_PUBLIC_TEMPLATE_CLIENT_ID` - Thirdweb client ID
- `NEXT_PUBLIC_CAMP_ORIGIN_API_KEY` - Camp Origin API key
- `NEXT_PUBLIC_CAMP_ORIGIN_CLIENT_ID` - Camp Origin client ID
- `NEXT_PUBLIC_POCKETBASE_URL` - PocketBase instance URL

### 🔄 If You've Already Committed API Keys:
1. **Immediately revoke/regenerate** the exposed keys
2. Remove them from git history: `git filter-branch --force --index-filter "git rm --cached --ignore-unmatch .env" --prune-empty --tag-name-filter cat -- --all`
3. Force push: `git push origin --force --all`
4. Update your deployment with new keys

### 📚 Resources:
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Thirdweb Security Best Practices](https://portal.thirdweb.com/typescript/v5/client)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---
**Remember: Security is everyone's responsibility! 🔒**
