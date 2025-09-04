# Supabase Setup Guide - F&S Inventory Manager

This comprehensive guide will walk you through setting up Supabase for your inventory management application. Follow these steps carefully to ensure a proper setup.

## 📋 Prerequisites

Before starting, ensure you have:
- A modern web browser
- A Supabase account (free tier available)
- Access to your project files
- Basic understanding of web development concepts

## 🚀 Step-by-Step Setup

### Step 1: Create a Supabase Project

#### 1.1 Sign Up for Supabase
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign Up"
3. Choose your preferred authentication method:
   - **GitHub** (recommended for developers)
   - **Google** (quick setup)
   - **Email** (traditional signup)
4. Complete the verification process

#### 1.2 Create New Project
1. In your Supabase dashboard, click "New Project"
2. **Organization**: Select existing or create new
3. **Project Details**:
   - **Name**: `inventory-manager` (or your preferred name)
   - **Database Password**: Create a strong password (12+ characters)
   - **Region**: Choose closest to your users for optimal performance
   - **Pricing Plan**: Start with "Free" tier (upgrade later if needed)
4. Click "Create new project"
5. Wait for project initialization (1-3 minutes)

#### 1.3 Project Status Check
- ✅ **Database**: Should show "Active"
- ✅ **API**: Should show "Active"
- ✅ **Auth**: Should show "Active"
- ✅ **Storage**: Should show "Active"

### Step 2: Get Your Project Credentials

#### 2.1 Access API Settings
1. In your project dashboard, navigate to **Settings** → **API**
2. You'll see two important sections:
   - **Project API keys**
   - **Project URL**

#### 2.2 Copy Required Credentials
1. **Project URL**: Copy the URL (looks like `https://xxxxxxxxxxxxx.supabase.co`)
2. **Anon public key**: Copy the key (starts with `eyJ...`)
3. **Service role key**: Keep this secure (for admin operations only)

#### 2.3 Security Notes
- ✅ **Anon key**: Safe to use in client-side code
- ⚠️ **Service role key**: Never expose in client-side code
- 🔒 Store credentials securely for future reference

### Step 3: Update Your Application Configuration

#### 3.1 Locate Configuration File
1. Open `app.js` in your project directory
2. Find the Supabase configuration section (usually lines 5-7)

#### 3.2 Replace Placeholder Values
```javascript
// Replace these with your actual Supabase credentials
const SUPABASE_URL = "https://your-project-id.supabase.co";
const SUPABASE_ANON_KEY = "your-actual-anon-key-here";
```

#### 3.3 Verification Checklist
- [ ] URL starts with `https://`
- [ ] URL ends with `.supabase.co`
- [ ] Anon key starts with `eyJ`
- [ ] No extra spaces or quotes
- [ ] No trailing commas

### Step 4: Set Up the Database Schema

#### 4.1 Access SQL Editor
1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query" to create a new SQL script
3. Clear any existing content

#### 4.2 Run Database Schema
1. Copy the entire contents of `database.sql` from your project
2. Paste it into the SQL Editor
3. Click "Run" to execute the script
4. Wait for completion (should take 10-30 seconds)

#### 4.3 Verify Schema Creation
After successful execution, you should see:
- ✅ Success messages for table creation
- ✅ Success messages for policy creation
- ✅ Final table structure display

#### 4.4 Expected Table Structure
Your database should now have these tables:
- **users** - User authentication data
- **categories** - Inventory categories
- **items** - Individual inventory items

### Step 5: Configure Authentication

#### 5.1 Access Auth Settings
1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your authentication preferences

#### 5.2 Email Settings (Optional)
1. Go to **Authentication** → **Email Templates**
2. Customize email templates if needed
3. Set up SMTP settings for custom email domain

#### 5.3 Social Auth (Optional)
1. Go to **Authentication** → **Providers**
2. Configure Google, GitHub, or other providers
3. Add authorized redirect URLs

### Step 6: Set Up Row Level Security (RLS)

#### 6.1 Enable RLS
1. Go to **Authentication** → **Policies**
2. Ensure RLS is enabled for all tables
3. Verify policies were created by the database.sql script

#### 6.2 Policy Overview
Your app uses these RLS policies:
- **Public read access** - Anyone can view data
- **Authenticated write access** - Only logged-in users can modify
- **Owner-based updates** - Users can only modify their own data

### Step 7: Test Your Setup

#### 7.1 Local Testing
1. Start your local server
2. Open the application in your browser
3. Test the following features:
   - [ ] View categories and items
   - [ ] Sign up for a new account
   - [ ] Sign in with existing account
   - [ ] Add/edit/delete categories
   - [ ] Add/edit/delete items
   - [ ] Add variants to items

#### 7.2 Common Test Scenarios
- **View-only mode**: Should work without authentication
- **Edit mode**: Should require authentication
- **Data persistence**: Changes should save to database
- **Real-time updates**: Changes should appear immediately

### Step 8: Production Deployment

#### 8.1 Update Domain Settings
1. Go to **Settings** → **API**
2. Add your production domain to allowed origins
3. Update redirect URLs for authentication

#### 8.2 Environment Variables
For production, consider using environment variables:
```javascript
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
```

#### 8.3 SSL/HTTPS
- Ensure your domain uses HTTPS
- Required for PWA features
- Required for service worker functionality

## 🔧 Troubleshooting

### Common Issues

#### "Invalid API key"
- Verify the anon key is correct
- Check for extra spaces or characters
- Ensure you're using the anon key, not service role key

#### "Failed to fetch"
- Check internet connection
- Verify Supabase URL is correct
- Check browser console for CORS errors

#### "RLS policy violation"
- Verify RLS policies are enabled
- Check if user is authenticated
- Verify user has proper permissions

#### "Table doesn't exist"
- Run the database.sql script again
- Check if tables were created successfully
- Verify table names match exactly

#### "Authentication failed"
- Check email/password combination
- Verify user exists in database
- Check if email confirmation is required

### Debug Mode

To enable debug logging:
1. Open browser developer tools
2. Go to Console tab
3. Look for Supabase-related errors
4. Check Network tab for failed requests

### Performance Issues

#### Slow Loading
- Check database region proximity
- Verify internet connection
- Consider upgrading Supabase plan

#### High Bandwidth Usage
- Implement proper caching
- Use service worker for offline support
- Optimize image sizes

## 📊 Monitoring

### Supabase Dashboard
Monitor your app's performance:
1. **Database**: Check query performance
2. **Auth**: Monitor user activity
3. **API**: Track request volume
4. **Storage**: Monitor file usage

### Analytics
Consider adding analytics:
- Google Analytics
- Supabase Analytics
- Custom event tracking

## 🔒 Security Best Practices

### API Keys
- Never expose service role key
- Use environment variables
- Rotate keys regularly

### RLS Policies
- Test all policies thoroughly
- Use principle of least privilege
- Regular security audits

### Data Validation
- Validate all user inputs
- Sanitize data before storage
- Implement proper error handling

## 📈 Scaling

### Free Tier Limits
- 500MB database
- 2GB bandwidth
- 50,000 monthly active users
- 500MB file storage

### Upgrade Considerations
- Monitor usage in dashboard
- Plan for growth
- Consider paid plans for production

## 🆘 Support

### Supabase Support
- [Documentation](https://supabase.com/docs)
- [Discord Community](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase)

### Application Support
- Check browser console for errors
- Verify network connectivity
- Test with different browsers

## 📝 Maintenance

### Regular Tasks
- Monitor database performance
- Check for security updates
- Backup important data
- Update dependencies

### Backup Strategy
- Export database regularly
- Store backups securely
- Test restore procedures

This setup guide should get your F&S Inventory Manager running smoothly with Supabase. If you encounter any issues, refer to the troubleshooting section or seek help from the Supabase community. 