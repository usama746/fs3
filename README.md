# F&S Inventory Manager

A modern, responsive inventory management application with cloud database integration. Built with vanilla JavaScript, HTML, and CSS for maximum compatibility and performance.

## 🚀 Features

-  📱 **Progressive Web App (PWA)** - Install on mobile devices
-  🌙 **Dark Mode** - Toggle between light and dark themes
-  🔐 **User Authentication** - Secure login system
-  👁️ **View-Only Mode** - Browse data without authentication
-  ✏️ **Edit Mode** - Full editing capabilities when authenticated
-  💾 **Cloud Database** - Data syncs across devices in real-time
-  📊 **Category Management** - Organize items by categories
-  🎨 **Variant Support** - Multiple colors, prices, and quantities per item
-  ⚡ **Real-time Updates** - Changes sync immediately
-  📱 **Mobile-First Design** - Optimized for all screen sizes
-  💾 **Offline Support** - Basic functionality works without internet

## 📋 Prerequisites

-  A modern web browser (Chrome, Firefox, Safari, Edge)
-  A cloud database account
-  Basic knowledge of HTML/CSS/JavaScript (for customization)
-  A local web server (for development)

## 🛠️ Quick Setup

### 1. Database Setup

1. Create a cloud database account
2. Set up the database schema using `database.sql`
3. Get your database credentials

### 2. Application Configuration

1. Open `app.js` in your project
2. Update the database configuration:

```javascript
const SUPABASE_URL = "your-database-url";
const SUPABASE_ANON_KEY = "your-database-key";
```

### 3. Local Development

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### 4. Access Application

1. Open your web browser
2. Navigate to `http://localhost:8000`
3. The application should load and connect to your database

## 🚀 Deployment

### Static Hosting (Recommended)

1. Push your code to GitHub
2. Deploy to Netlify, Vercel, or GitHub Pages
3. Update database settings with your domain

### Traditional Hosting

1. Upload all files to your web server
2. Ensure `index.html` is in the root directory
3. Update database settings with your domain

## 🔧 Troubleshooting

### Common Issues

#### "Failed to load data from database"

-  Verify database URL and key in `app.js`
-  Check internet connection
-  Verify database schema was created properly

#### "Login failed"

-  Verify email and password are correct
-  Check if user exists in database
-  Ensure email confirmation is completed (if required)

#### "User not authenticated"

-  Verify user exists in database
-  Check security policies
-  Clear browser cache and try again

#### Data not saving

-  Check authentication status
-  Verify database permissions
-  Check browser console for errors

## 📱 PWA Features

### Installation

-  **Android**: Tap "Add to Home Screen" in browser menu
-  **iOS**: Tap "Add to Home Screen" in Safari share menu
-  **Desktop**: Click install button in browser address bar

### Offline Support

-  Basic functionality works without internet
-  Data syncs when connection is restored
-  Automatic updates when app is reopened

## 🎨 Customization

### Themes

The app supports both light and dark modes:

-  Toggle via hamburger menu
-  Preference is saved locally
-  Automatic theme detection

### Styling

All styles are in `styles.css`:

-  CSS variables for easy theming
-  Responsive design
-  Mobile-first approach

## 🔒 Security

-  User authentication via Supabase
-  Row Level Security (RLS) policies
-  Secure API key handling
-  HTTPS required for PWA features

## 📊 Performance

-  Vanilla JavaScript for maximum speed
-  Minimal dependencies
-  Optimized for mobile devices
-  Service worker for caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
