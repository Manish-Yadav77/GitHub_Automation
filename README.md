# 🚀 AutoGit - Automated GitHub Commit Generator

<div align="center">
  <img src="Frontend/public/logo.png" alt="AutoGit Logo" width="200"/>
  
  [![Live Demo](https://img.shields.io/badge/Demo-Live-success?style=for-the-badge)](https://autocommitor.netlify.app/)
  [![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/Manish-Yadav77/autogit)
  [![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
</div>

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

## 🌟 Overview

**AutoGit** is a powerful automation platform that helps developers maintain consistent GitHub activity by automatically generating meaningful commits to their repositories. Perfect for maintaining green contribution graphs, demonstrating consistent development activity, and automating routine repository updates.

### 🎯 Why AutoGit?

- **Maintain Consistency**: Never break your GitHub streak again
- **Professional Appearance**: Keep your profile active for potential employers
- **Time-Saving**: Automate routine commits and repository maintenance
- **Customizable**: Full control over commit messages, timing, and repositories
- **Secure**: OAuth-based GitHub integration with proper permission scopes

## ✨ Features

### 🔐 Authentication & Security
- **GitHub OAuth Integration**: Secure login with GitHub credentials
- **JWT Authentication**: Stateless session management
- **Protected Routes**: Role-based access control
- **Token Management**: Automatic token refresh and validation

### 🤖 Automation Engine
- **Smart Scheduling**: Flexible time-based automation rules
- **Custom Commit Messages**: Predefined and randomized commit messages
- **File Targeting**: Specify exact files to modify (README.md, docs, etc.)
- **Commit Limits**: Daily and total commit limits to maintain realistic activity
- **Multiple Repositories**: Support for multiple repo automation

### 📊 Analytics & Monitoring
- **Real-time Dashboard**: Live automation status and statistics
- **Commit History**: Complete log of all automated commits
- **Success Metrics**: Track automation performance and reliability
- **Activity Analytics**: Visualize your automated GitHub activity

### 🎨 Modern UI/UX
- **Responsive Design**: Optimized for all screen sizes
- **Interactive Loading**: Engaging progress indicators
- **Real-time Updates**: Live status updates and notifications
- **Intuitive Interface**: Clean, modern design with smooth animations

## 🌐 Live Demo

🔗 **[Try AutoGit Live](https://autocommitor.netlify.app/)**

Test credentials available on the demo site for exploration.

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication
- **React Hot Toast** - Toast notifications
- **Lucide React** - Modern icon library

### Backend
- **Node.js** - JavaScript runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **GitHub API** - Repository and commit management
- **Cron Jobs** - Scheduled task automation

### DevOps & Deployment
- **Netlify** - Frontend hosting and deployment
- **Render** - Backend API hosting
- **GitHub Actions** - CI/CD pipeline
- **Environment Variables** - Secure configuration management

## 📁 Project Structure

AutoGit/

├── Backend/ # Node.js API Server 

│ ├── src/ 

│ │ ├── middleware/ # Auth & validation middleware 

│ │ ├── models/ # MongoDB schemas

│ │ ├── routes/ # API endpoints

│ │ ├── utils/ # GitHub integration utilities

│ │ └── server.js # Express app entry point

│ ├── package.json

│ └── .env # Environment variables

├── Frontend/ # React SPA

│ ├── src/

│ │ ├── components/ # Reusable UI components

│ │ ├── context/ # React context providers

│ │ ├── pages/ # Route components

│ │ ├── utils/ # Helper functions

│ │ └── App.jsx # Main app component

│ ├── public/ # Static assets

│ ├── package.json

│ └── .env # Environment variables

└── README.md

## 🚀 Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud)
- **GitHub OAuth App** (for authentication)

### 1. Clone Repository
git clone https://github.com/yourusername/autogit.git
cd autogit

### 2. Backend Setup
cd Backend
npm install

Create .env file
cp .env.example .env

Configure environment variables (see Configuration section)
Start development server
npm run dev

### 3. Frontend Setup
cd Frontend
npm install

Create .env file
cp .env.example .env

Configure environment variables
Start development server
npm run dev

### 4. Access Application
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

## ⚙️ Configuration

### Backend Environment Variables (.env)
Server Configuration
PORT=5000
NODE_ENV=development

Database
MONGODB_URI=mongodb://localhost:27017/autogit

OR MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autogit

Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5173/auth/callback

CORS
CORS_ORIGIN=http://localhost:5173

### Frontend Environment Variables (.env)
API Configuration
VITE_API_URL=http://localhost:5000

GitHub OAuth
VITE_GITHUB_CLIENT_ID=your-github-client-id
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback

### GitHub OAuth Setup
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in application details:
   - **Application name**: AutoGit
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/callback`
4. Copy Client ID and Client Secret to your `.env` files

## 📖 Usage

### 1. Account Setup
1. Visit the application at `http://localhost:5173`
2. Click "Sign in with GitHub"
3. Authorize the application with required permissions
4. Complete your profile setup

### 2. Create Automation Rules
1. Navigate to "Create Automation"
2. Configure your automation:
   - **Repository**: Select target repository
   - **Schedule**: Set days and time windows
   - **Commit Settings**: Messages, file targets, limits
   - **Advanced Options**: Custom phrases, file patterns

### 3. Monitor Activity
1. Check the **Dashboard** for real-time status
2. View **Analytics** for detailed insights
3. Review **Commit History** for all automated activities

### 4. Manage Settings
1. Update your **Profile** information
2. Modify **Automation Rules** as needed
3. Configure **Notification Preferences**

## 📡 API Documentation

### Authentication Endpoints
POST /api/auth/login # User login
POST /api/auth/register # User registration
POST /api/auth/github/callback # GitHub OAuth callback
GET /api/auth/me # Get current user
POST /api/auth/logout # User logout

### Automation Endpoints
GET /api/automation # Get user automations
POST /api/automation # Create automation
PUT /api/automation/:id # Update automation
DELETE /api/automation/:id # Delete automation
POST /api/automation/:id/toggle # Toggle automation status

### Repository Endpoints
GET /api/repo/list # Get user repositories
GET /api/repo/files # Get repository files

### User Management
GET /api/user/profile # Get user profile
PATCH /api/user/profile # Update profile
POST /api/user/disconnect-github # Disconnect GitHub

## 📸 Screenshots

### 🏠 Landing Page
Beautiful, responsive landing page with clear value proposition and feature highlights.

### 📊 Dashboard
Real-time automation status, statistics, and quick actions for managing your automated commits.

### 🤖 Create Automation
Intuitive form for setting up new automation rules with advanced scheduling options.

### 📈 Analytics
Comprehensive analytics showing your automation performance and GitHub activity trends.

### 👤 Profile Management
User profile with GitHub integration status and account statistics.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Guidelines
- Follow the existing code style
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation as needed
- Ensure responsive design compatibility

### Bug Reports
Please use the GitHub Issues tab to report bugs. Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub API** - For providing robust repository management capabilities
- **MongoDB** - For flexible, scalable data storage
- **Tailwind CSS** - For making beautiful, responsive design effortless
- **React Community** - For continuous innovation and excellent tooling
- **Open Source Contributors** - For inspiration and code examples

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Manish-Yadav77/autogit/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Manish-Yadav77/autogit/discussions)
- 📧 **Email**: manishkyadav969@gmail.com
- 🌐 **Website**: [autogit.com](https://autocommitor.netlify.app)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/Manish-Yadav77">Manish Kumar Yadav</a></p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
