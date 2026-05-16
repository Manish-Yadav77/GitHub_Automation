import Automation from '../models/Automation.js';
import CommitLog from '../models/CommitLog.js';
import {
  createOrUpdateFile,
  generateCommitContent,
  getFileContent
} from './github.js';
import { getGitHubTokenForUser } from '../services/tokenService.js';

const convertUTCToTimezone = (utcDate, timezone) => {
  try {
    const utcString = utcDate.toLocaleString('en-US', { timeZone: 'UTC' });
    const utcTime = new Date(utcString);
    const tzString = utcDate.toLocaleString('en-US', { timeZone: timezone });
    const tzTime = new Date(tzString);
    const offset = tzTime.getTime() - utcTime.getTime();
    const converted = new Date(utcDate.getTime() + offset);

    return {
      hours: converted.getHours(),
      minutes: converted.getMinutes(),
      day: converted.getDay()
    };
  } catch (error) {
    console.error(`Error converting timezone ${timezone}:`, error);
    return {
      hours: utcDate.getHours(),
      minutes: utcDate.getMinutes(),
      day: utcDate.getDay()
    };
  }
};

export const executeScheduledCommits = async () => {
  try {
    const now = new Date();
    const currentDay = now.getUTCDay();

    const activeAutomations = await Automation.find({
      status: 'active',
      'schedule.daysOfWeek': currentDay
    }).populate('userId');

    for (const automation of activeAutomations) {
      try {
        const userTimezone = automation.userId?.settings?.preferences?.timezone
          || automation.schedule?.timezone
          || 'Asia/Kolkata';
        const userTime = convertUTCToTimezone(now, userTimezone);
        const scheduledDays = automation.schedule?.daysOfWeek || [];

        if (!scheduledDays.includes(userTime.day)) {
          continue;
        }

        const [startHour, startMinute] = automation.timeRange.startTime.split(':').map(Number);
        const [endHour, endMinute] = automation.timeRange.endTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const currentTotalMinutes = userTime.hours * 60 + userTime.minutes;

        if (currentTotalMinutes < startTotalMinutes || currentTotalMinutes > endTotalMinutes) {
          continue;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCommits = await CommitLog.countDocuments({
          automationId: automation._id,
          createdAt: { $gte: today },
          status: 'success',
          'metadata.badgeAction': { $ne: 'pr_cycle' }
        });

        if (todayCommits >= Math.min(automation.maxCommitsPerDay, 5)) {
          continue;
        }

        const token = await getGitHubTokenForUser(automation.userId);
        if (!token) {
          console.log(`No GitHub token for automation ${automation._id}`);
          continue;
        }

        await executeCommit(automation, token);
      } catch (error) {
        console.error(`Error processing automation ${automation._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in executeScheduledCommits:', error);
  }
};

export const executeCommit = async (automation, accessToken) => {
  const commitLog = new CommitLog({
    automationId: automation._id,
    userId: automation.userId?._id || automation.userId,
    repoName: automation.repoName,
    commitMessage: '',
    commitSha: '',
    fileName: automation.targetFile,
    status: 'pending',
    metadata: {
      scheduledTime: new Date(),
      timeZone: automation.schedule?.timezone || 'UTC',
      dayOfWeek: new Date().getDay()
    }
  });

  try {
    await commitLog.save();

    const phrases = automation.commitPhrases?.length
      ? automation.commitPhrases
      : ['Update daily notes', 'Refresh project activity', 'Maintain contribution log'];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    const coAuthor = automation.badgeAutomation?.includeCoAuthor && automation.userId?.altGitHubUsername
      ? `\n\nCo-authored-by: ${automation.userId.altGitHubUsername} <${automation.userId.altGitHubEmail || `${automation.userId.altGitHubUsername}@users.noreply.github.com`}>`
      : '';
    const commitMessage = `${randomPhrase}\n\nAuto-committed via https://autocommitor.netlify.app${coAuthor}`;

    const { content: currentContent, sha } = await getFileContent(
      accessToken,
      automation.repoOwner,
      automation.repoName,
      automation.targetFile
    );

    const newContent = generateCommitContent([randomPhrase], currentContent);
    const result = await createOrUpdateFile(
      accessToken,
      automation.repoOwner,
      automation.repoName,
      automation.targetFile,
      newContent,
      commitMessage,
      sha
    );

    commitLog.commitMessage = commitMessage;
    commitLog.commitSha = result.commit.sha;
    commitLog.status = 'success';
    commitLog.metadata.executedTime = new Date();
    commitLog.metadata.coAuthored = Boolean(coAuthor);
    await commitLog.save();

    await automation.incrementCommitCount();
    automation.lastCommit = {
      timestamp: new Date(),
      message: randomPhrase,
      sha: result.commit.sha
    };
    await automation.save();

    return result;
  } catch (error) {
    commitLog.status = 'failed';
    commitLog.error = {
      message: error.message,
      code: error.response?.status || 'UNKNOWN'
    };
    await commitLog.save();
    throw error;
  }
};
