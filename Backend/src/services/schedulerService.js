import cron from 'node-cron';
import Automation from '../models/Automation.js';
import Job from '../models/Job.js';
import { executeCommit } from '../utils/githubCommit.js';
import { getGitHubTokenForUser } from './tokenService.js';
import { refreshBadgeProgress, runPrCycle, runQuickdraw } from './badgeService.js';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const parseTime = (value) => {
  const [hours, minutes] = value.split(':').map(Number);
  return { hours, minutes };
};

const makeLocalDate = (timeZone, hours, minutes) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const local = new Date(`${parts.year}-${parts.month}-${parts.day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  const offset = new Date(local.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
    - new Date(local.toLocaleString('en-US', { timeZone })).getTime();
  return new Date(local.getTime() + offset);
};

const todayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export const generateDailyJobs = async () => {
  const { start, end } = todayBounds();
  const automations = await Automation.find({ status: 'active' }).populate('userId');

  for (const automation of automations) {
    const existing = await Job.countDocuments({
      automationId: automation._id,
      scheduledAt: { $gte: start, $lt: end }
    });

    if (existing > 0) continue;

    const timeZone = automation.schedule?.timezone
      || automation.userId?.settings?.preferences?.timezone
      || automation.userId?.settings?.timezone
      || 'Asia/Kolkata';
    const { hours: startHour, minutes: startMinute } = parseTime(automation.timeRange.startTime);
    const { hours: endHour, minutes: endMinute } = parseTime(automation.timeRange.endTime);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const maxCommits = Math.min(automation.maxCommitsPerDay || 1, 5);
    const count = randomInt(1, maxCommits);

    const jobs = [];
    for (let index = 0; index < count; index += 1) {
      const minuteOfDay = randomInt(startMinutes, endMinutes);
      const jitter = randomInt(0, 45);
      const scheduledAt = makeLocalDate(timeZone, Math.floor((minuteOfDay + jitter) / 60), (minuteOfDay + jitter) % 60);
      jobs.push({
        userId: automation.userId._id,
        automationId: automation._id,
        type: 'streak_commit',
        scheduledAt,
        payload: { timeZone }
      });
    }

    if (automation.badgeAutomation?.enabled && automation.badgeAutomation?.prCycleEnabled) {
      jobs.push({
        userId: automation.userId._id,
        automationId: automation._id,
        type: 'pr_cycle',
        scheduledAt: makeLocalDate(timeZone, randomInt(10, 20), randomInt(0, 59))
      });
    }

    if (automation.badgeAutomation?.enabled && automation.badgeAutomation?.quickdrawEnabled) {
      const alreadyDone = await Job.exists({
        automationId: automation._id,
        type: 'issue_quickdraw',
        status: 'success'
      });
      if (!alreadyDone) {
        jobs.push({
          userId: automation.userId._id,
          automationId: automation._id,
          type: 'issue_quickdraw',
          scheduledAt: new Date(Date.now() + 2 * 60 * 1000)
        });
      }
    }

    await Job.insertMany(jobs);
  }
};

export const executeJob = async (job) => {
  const current = await Job.findByIdAndUpdate(
    job._id,
    { status: 'running', $inc: { attempts: 1 } },
    { new: true }
  );

  try {
    const automation = current.automationId
      ? await Automation.findById(current.automationId).populate('userId')
      : null;

    if (current.type !== 'badge_check' && !automation) {
      throw new Error('Automation not found for job');
    }

    if (current.type === 'streak_commit') {
      const token = await getGitHubTokenForUser(current.userId);
      await executeCommit(automation, token);
    }

    if (current.type === 'pr_cycle') {
      await runPrCycle(automation);
    }

    if (current.type === 'issue_quickdraw') {
      await runQuickdraw(automation);
    }

    if (current.type === 'badge_check') {
      await refreshBadgeProgress(current.userId);
    }

    current.status = 'success';
    current.executedAt = new Date();
    current.errorMessage = undefined;
    await current.save();
  } catch (error) {
    current.errorMessage = error.message;
    current.status = current.attempts >= 3 ? 'failed' : 'pending';
    current.nextRetryAt = current.attempts >= 3
      ? undefined
      : new Date(Date.now() + [5, 15, 45][current.attempts - 1] * 60 * 1000);
    await current.save();
  }
};

export const processDueJobs = async () => {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  await Job.updateMany(
    { status: 'pending', scheduledAt: { $lt: fourHoursAgo } },
    { status: 'skipped', errorMessage: 'Missed execution window exceeded 4 hours' }
  );

  const jobs = await Job.find({
    status: 'pending',
    scheduledAt: { $lte: new Date(), $gte: fourHoursAgo },
    $or: [
      { nextRetryAt: { $exists: false } },
      { nextRetryAt: null },
      { nextRetryAt: { $lte: new Date() } }
    ]
  }).sort({ scheduledAt: 1 }).limit(10);

  for (const job of jobs) {
    await executeJob(job);
  }
};

export const startScheduler = () => {
  cron.schedule('1 0 * * *', generateDailyJobs, { timezone: 'UTC' });
  cron.schedule('* * * * *', processDueJobs, { timezone: 'UTC' });
  cron.schedule('0 */6 * * *', async () => {
    const automations = await Automation.find({ status: 'active' }).select('userId');
    const userIds = [...new Set(automations.map(item => item.userId.toString()))];
    await Job.insertMany(userIds.map(userId => ({
      userId,
      type: 'badge_check',
      scheduledAt: new Date()
    })));
  }, { timezone: 'UTC' });
};
