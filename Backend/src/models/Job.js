import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  automationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Automation',
    default: null,
    index: true
  },
  type: {
    type: String,
    enum: ['streak_commit', 'pr_cycle', 'issue_quickdraw', 'badge_check'],
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  executedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'running', 'success', 'failed', 'skipped'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  errorMessage: String,
  nextRetryAt: Date
}, {
  timestamps: true
});

jobSchema.index({ status: 1, scheduledAt: 1 });
jobSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Job', jobSchema);
