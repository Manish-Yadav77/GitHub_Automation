// Fixed User Model - src/models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.githubId; // Password not required if using GitHub OAuth
    }
  },
  githubId: {
    type: String,
    sparse: true,
    unique: true
  },
  githubUsername: {
    type: String,
    sparse: true
  },
  githubAccessToken: {
    type: String,
    select: false // Don't include in regular queries
  },
  avatar: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'premium'],
    default: 'free'
  },
  settings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: false
      },
      automationStatus: {
        type: Boolean,
        default: true
      },
      commitFailures: {
        type: Boolean,
        default: true
      },
      weeklyReport: {
        type: Boolean,
        default: true
      }
    },
    preferences: {
      theme: {
        type: String,
        default: 'light'
      },
      timezone: {
        type: String,
        default: 'UTC'
      },
      dateFormat: {
        type: String,
        default: 'MM/DD/YYYY'
      },
      language: {
        type: String,
        default: 'en'
      }
    },
    automation: {
      maxConcurrentRules: {
        type: Number,
        default: 5
      },
      defaultCommitFile: {
        type: String,
        default: 'README.md'
      },
      defaultTimeRange: {
        start: {
          type: String,
          default: '09:00'
        },
        end: {
          type: String,
          default: '17:00'
        }
      }
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ githubId: 1 });
userSchema.index({ username: 1 });

// Pre-save middleware to handle GitHub users without email
userSchema.pre('save', function(next) {
  // If this is a GitHub user and email is missing, create a fallback
  if (this.githubId && (!this.email || this.email === null)) {
    this.email = `${this.githubUsername || this.githubId}@github.local`;
  }
  next();
});

// Method to check if user has GitHub connection
userSchema.methods.hasGitHubConnection = function() {
  return !!(this.githubId && this.githubAccessToken);
};

// Method to get display name
userSchema.methods.getDisplayName = function() {
  return this.githubUsername || this.username;
};

export default mongoose.model('User', userSchema);