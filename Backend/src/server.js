// Enhanced Server with Better Cron Scheduling - src/server.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

// Import routes
import authRoutes from './routes/auth.js';
import automationRoutes from './routes/automation.js';
import userRoutes from './routes/user.js';
import repoRoutes from './routes/repo.js';

// Import middleware
import { authenticateToken } from './middleware/auth.js';

// Import utilities
import { executeScheduledCommits } from './utils/githubCommit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://autocommitor.netlify.app',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/github-automation', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/automation', authenticateToken, automationRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/repos', authenticateToken, repoRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Debug route to trigger commits manually (for testing)
app.post('/api/debug/trigger-commits', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Manual commit trigger initiated...');
    await executeScheduledCommits();
    res.json({ success: true, message: 'Commit check triggered manually' });
  } catch (error) {
    console.error('❌ Manual trigger failed:', error);
    res.status(500).json({ error: 'Failed to trigger commits', details: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Enhanced cron scheduling with multiple intervals for better coverage
console.log('⚙️  Setting up cron jobs...');

// Primary scheduler - runs every minute
cron.schedule('* * * * *', () => {
  const now = new Date();
  console.log(`🕐 Running scheduled commit check at ${now.toISOString()}`);
  executeScheduledCommits();
}, {
  timezone: "UTC"
});

// Additional schedulers for testing/backup
// Run every 5 minutes as backup
cron.schedule('*/5 * * * *', () => {
  console.log('🔄 Running 5-minute backup commit check...');
  executeScheduledCommits();
}, {
  timezone: "UTC"
});

// Test scheduler for immediate execution (only in development)
if (process.env.NODE_ENV === 'development') {
  cron.schedule('*/30 * * * * *', () => { // Every 30 seconds in dev
    console.log('🚀 Dev mode: Running frequent commit check...');
    executeScheduledCommits();
  }, {
    timezone: "UTC"
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Cron jobs scheduled and active`);
  
  // Run initial commit check on startup
  setTimeout(() => {
    console.log('🎯 Running initial commit check...');
    executeScheduledCommits();
  }, 5000); // Wait 5 seconds after startup
});