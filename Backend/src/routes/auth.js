// Fixed Authentication Routes - src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { getGitHubUser, getGitHubAccessToken, getGitHubUserEmails } from '../utils/github.js';
import TokenDenylist from '../models/TokenDenylist.js';
import { storeGitHubToken } from '../services/tokenService.js';

const router = express.Router();

const issueToken = (userId) => jwt.sign(
  { userId, jti: crypto.randomUUID() },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

const setAuthCookie = (res, token) => {
  res.cookie('autogit_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  });
};

const getCookie = (req, name) => {
  const cookies = req.headers.cookie || '';
  const match = cookies
    .split(';')
    .map(item => item.trim())
    .find(item => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
};

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('username').trim().isLength({ min: 3 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists with this email or username' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      username,
      isVerified: true // Auto-verify for demo
    });

    await user.save();

    // Generate JWT token
    const token = issueToken(user._id);
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = issueToken(user._id);
    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        plan: user.plan,
        githubConnected: !!(user.githubAccessToken || user.githubTokenEncrypted)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GitHub OAuth callback
router.post('/github/callback', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    console.log('Processing GitHub OAuth with code:', code);

    // Exchange code for access token
    const accessToken = await getGitHubAccessToken(code);
    console.log('Received access token successfully');
    
    // Get user info from GitHub
    const githubUser = await getGitHubUser(accessToken);
    console.log('GitHub user data:', {
      id: githubUser.id,
      login: githubUser.login,
      email: githubUser.email
    });

    // Get user email if not provided in user data
    let userEmail = githubUser.email;
    if (!userEmail) {
      console.log('Email not in user data, fetching from emails endpoint...');
      userEmail = await getGitHubUserEmails(accessToken);
    }

    // If still no email, create a fallback
    if (!userEmail) {
      userEmail = `${githubUser.login}@github.local`; // Fallback email
      console.log('No email found, using fallback:', userEmail);
    }

    // Check if user exists by GitHub ID first
    let user = await User.findOne({ githubId: githubUser.id.toString() });

    if (!user) {
      // Check if user exists with same email
      if (userEmail && userEmail !== `${githubUser.login}@github.local`) {
        user = await User.findOne({ email: userEmail });
      }
      
      if (user) {
        // Link GitHub account to existing user
        user.githubId = githubUser.id.toString();
        user.githubUsername = githubUser.login;
        storeGitHubToken(user, accessToken);
        user.avatar = githubUser.avatar_url;
        console.log('Linking GitHub to existing user');
      } else {
        // Create new user
        user = new User({
          email: userEmail,
          username: githubUser.login,
          githubId: githubUser.id.toString(),
          githubUsername: githubUser.login,
          avatar: githubUser.avatar_url,
          isVerified: true
        });
        storeGitHubToken(user, accessToken);
        console.log('Creating new user from GitHub');
      }
    } else {
      // Update existing GitHub user
      storeGitHubToken(user, accessToken);
      user.avatar = githubUser.avatar_url;
      user.githubUsername = githubUser.login; // Update username in case it changed
      console.log('Updating existing GitHub user');
    }

    await user.save();

    // Generate JWT token
    const token = issueToken(user._id);
    setAuthCookie(res, token);

    res.json({
      message: 'GitHub authentication successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        plan: user.plan,
        githubConnected: true,
        githubUsername: user.githubUsername
      }
    });
  } catch (error) {
    console.error('GitHub auth error:', error);
    res.status(500).json({ error: 'GitHub authentication failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        plan: user.plan,
        githubConnected: !!(user.githubAccessToken || user.githubTokenEncrypted),
        githubUsername: user.githubUsername,
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, async (req, res) => {
  const token = getCookie(req, 'autogit_token') || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.jti) {
        await TokenDenylist.create({
          jti: decoded.jti,
          expiresAt: new Date(decoded.exp * 1000)
        });
      }
    } catch (error) {
      // Ignore invalid tokens during logout.
    }
  }
  res.clearCookie('autogit_token');
  res.json({ message: 'Logout successful' });
});

export default router;
