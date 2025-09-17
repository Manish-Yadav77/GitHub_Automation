// Backend Middleware - Authentication - src/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

// Optional authentication middleware (for routes that work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.userId = user._id;
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't return errors, just continue without auth
    next();
  }
};

// Admin role check middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Plan-based access control
export const requirePlan = (requiredPlan) => {
  const planHierarchy = {
    'free': 0,
    'pro': 1,
    'premium': 2
  };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPlanLevel = planHierarchy[req.user.plan] || 0;
    const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        error: `${requiredPlan} plan required`,
        currentPlan: req.user.plan,
        requiredPlan
      });
    }

    next();
  };
};

// Rate limiting per user
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.userId) {
      return next();
    }

    const userId = req.userId.toString();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }

    // Get current requests for user
    const userRequests = requests.get(userId) || [];

    if (userRequests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((userRequests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(userId, userRequests);

    next();
  };
};

// GitHub token validation
export const validateGitHubToken = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('+githubAccessToken');
    
    if (!user || !user.githubAccessToken) {
      return res.status(400).json({ 
        error: 'GitHub account not connected',
        code: 'GITHUB_NOT_CONNECTED'
      });
    }

    req.githubToken = user.githubAccessToken;
    next();
  } catch (error) {
    console.error('GitHub token validation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Automation ownership check
export const validateAutomationOwnership = async (req, res, next) => {
  try {
    const automationId = req.params.id || req.params.automationId;
    
    if (!automationId) {
      return res.status(400).json({ error: 'Automation ID required' });
    }

    const Automation = (await import('../models/Automation.js')).default;
    const automation = await Automation.findOne({
      _id: automationId,
      userId: req.userId
    });

    if (!automation) {
      return res.status(404).json({ error: 'Automation not found or access denied' });
    }

    req.automation = automation;
    next();
  } catch (error) {
    console.error('Automation ownership validation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export default {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePlan,
  userRateLimit,
  validateGitHubToken,
  validateAutomationOwnership
};