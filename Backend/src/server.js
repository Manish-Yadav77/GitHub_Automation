import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import automationRoutes from './routes/automation.js';
import badgeRoutes from './routes/badges.js';
import jobRoutes from './routes/jobs.js';
import repoRoutes from './routes/repo.js';
import userRoutes from './routes/user.js';
import { authenticateToken, rejectUnsupportedMethods, requireJson } from './middleware/auth.js';
import { generateDailyJobs, processDueJobs, startScheduler } from './services/schedulerService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');
app.use(rejectUnsupportedMethods);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginResourcePolicy: { policy: 'same-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://autocommitor.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requireJson);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/github-automation', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/automation', authenticateToken, automationRoutes);
app.use('/api/badges', authenticateToken, badgeRoutes);
app.use('/api/jobs', authenticateToken, jobRoutes);
app.use('/api/repos', authenticateToken, repoRoutes);
app.use('/api/user', authenticateToken, userRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/ping', (req, res) => {
  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    cronJobsActive: true
  });
});

app.get('/api/health/detailed', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    scheduler: 'persisted-jobs',
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
    }
  });
});

app.post('/api/debug/trigger-commits', authenticateToken, async (req, res) => {
  try {
    await generateDailyJobs();
    await processDueJobs();
    res.json({ success: true, message: 'Job generation and due-job processing triggered manually' });
  } catch (error) {
    console.error('Manual trigger failed:', error);
    res.status(500).json({ error: 'Failed to trigger jobs', details: error.message });
  }
});

app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

startScheduler();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Persisted scheduler active');

  if (process.env.RENDER_EXTERNAL_URL) {
    setInterval(async () => {
      try {
        await fetch(`${process.env.RENDER_EXTERNAL_URL}/api/health`);
      } catch (error) {
        console.warn('Keep-alive ping failed:', error.message);
      }
    }, 9 * 60 * 1000);
  }

  setTimeout(() => {
    generateDailyJobs().then(processDueJobs).catch((error) => {
      console.error('Startup recovery failed:', error);
    });
  }, 5000);
});
