import BadgeProgress from '../models/BadgeProgress.js';
import Automation from '../models/Automation.js';
import CommitLog from '../models/CommitLog.js';
import {
  closeIssue,
  createBranch,
  createIssue,
  createOrUpdateFile,
  createPullRequest,
  deleteBranch,
  getBranch,
  getFileContent,
  getRepository,
  mergePullRequest
} from '../utils/github.js';
import { getGitHubTokenForUser } from './tokenService.js';

export const BADGES = [
  {
    name: 'pull_shark',
    label: 'Pull Shark',
    thresholds: { default: 2, bronze: 16, silver: 128, gold: 1024 },
    automation: 'Creates and merges pull requests in your selected repo.'
  },
  {
    name: 'yolo',
    label: 'YOLO',
    thresholds: { default: 1 },
    automation: 'Merges an unreviewed pull request when your repo allows it.'
  },
  {
    name: 'quickdraw',
    label: 'Quickdraw',
    thresholds: { default: 1 },
    automation: 'Opens and closes an issue within five minutes.'
  },
  {
    name: 'pair_extraordinaire',
    label: 'Pair Extraordinaire',
    thresholds: { default: 1, bronze: 10, silver: 24, gold: 48 },
    automation: 'Adds a Co-authored-by trailer to merged PR commits when configured.'
  },
  {
    name: 'galaxy_brain',
    label: 'Galaxy Brain',
    thresholds: { default: 2, bronze: 8, silver: 16, gold: 32 },
    automation: 'Helper only. GitHub requires the answer author/question owner flow on GitHub.'
  },
  {
    name: 'starstruck',
    label: 'Starstruck',
    thresholds: { default: 16, bronze: 128, silver: 512, gold: 4096 },
    automation: 'Tracks stars for your selected repo and gives a share link.'
  },
  {
    name: 'public_sponsor',
    label: 'Public Sponsor',
    thresholds: { default: 1 },
    automation: 'Manual only. Sponsorship requires a real GitHub Sponsors payment.'
  }
];

const getTier = (badgeName, count) => {
  const badge = BADGES.find(item => item.name === badgeName);
  if (!badge) return 'none';
  const { thresholds } = badge;

  if (thresholds.gold && count >= thresholds.gold) return 'gold';
  if (thresholds.silver && count >= thresholds.silver) return 'silver';
  if (thresholds.bronze && count >= thresholds.bronze) return 'bronze';
  if (thresholds.default && count >= thresholds.default) return 'default';
  return 'none';
};

export const ensureBadgeRows = async (userId) => {
  await Promise.all(BADGES.map((badge) => BadgeProgress.findOneAndUpdate(
    { userId, badgeName: badge.name },
    {
      $setOnInsert: {
        currentCount: 0,
        tier: badge.name === 'public_sponsor' ? 'manual' : 'none',
        metadata: { label: badge.label, automation: badge.automation }
      }
    },
    { upsert: true, new: true }
  )));
};

const updateBadge = async (userId, badgeName, count, metadata = {}) => {
  const tier = badgeName === 'public_sponsor' ? 'manual' : getTier(badgeName, count);
  const update = {
    currentCount: count,
    tier,
    lastChecked: new Date(),
    metadata
  };

  if (tier !== 'none' && tier !== 'manual') {
    update.earnedAt = new Date();
  }

  return BadgeProgress.findOneAndUpdate(
    { userId, badgeName },
    update,
    { upsert: true, new: true }
  );
};

export const refreshBadgeProgress = async (userId) => {
  await ensureBadgeRows(userId);

  const automations = await Automation.find({ userId });
  const selected = automations[0] || null;
  const token = await getGitHubTokenForUser(userId);

  const prMerges = await CommitLog.countDocuments({
    userId,
    status: 'success',
    'metadata.badgeAction': 'pr_cycle'
  });
  const quickdraw = await CommitLog.countDocuments({
    userId,
    status: 'success',
    'metadata.badgeAction': 'quickdraw'
  });
  const coAuthored = await CommitLog.countDocuments({
    userId,
    status: 'success',
    'metadata.coAuthored': true
  });

  await updateBadge(userId, 'pull_shark', prMerges, { source: 'local_pr_cycle_logs' });
  await updateBadge(userId, 'yolo', prMerges > 0 ? 1 : 0, { source: 'local_unreviewed_pr_cycle_logs' });
  await updateBadge(userId, 'quickdraw', quickdraw > 0 ? 1 : 0, { source: 'local_issue_logs' });
  await updateBadge(userId, 'pair_extraordinaire', coAuthored, { source: 'local_coauthored_pr_logs' });
  await updateBadge(userId, 'galaxy_brain', 0, {
    manual: true,
    note: 'Accepted discussion answers must be completed on GitHub.'
  });
  await updateBadge(userId, 'public_sponsor', 0, {
    manual: true,
    note: 'Requires sponsoring open source work via GitHub Sponsors.'
  });

  if (selected && token) {
    try {
      const repo = await getRepository(token, selected.repoOwner, selected.repoName);
      await updateBadge(userId, 'starstruck', repo.stargazers_count || 0, {
        repo: repo.full_name,
        shareUrl: repo.html_url
      });
    } catch (error) {
      await updateBadge(userId, 'starstruck', 0, {
        error: error.message,
        repo: `${selected.repoOwner}/${selected.repoName}`
      });
    }
  }

  return BadgeProgress.find({ userId }).sort({ badgeName: 1 });
};

export const runQuickdraw = async (automation) => {
  const token = await getGitHubTokenForUser(automation.userId);
  if (!token) throw new Error('GitHub account is not connected');

  const title = `AutoGit Quickdraw check ${new Date().toISOString()}`;
  const issue = await createIssue(token, automation.repoOwner, automation.repoName, {
    title,
    body: 'Created and closed by AutoGit for the Quickdraw achievement workflow.'
  });
  await closeIssue(token, automation.repoOwner, automation.repoName, issue.number);

  await CommitLog.create({
    automationId: automation._id,
    userId: automation.userId,
    repoName: automation.repoName,
    commitMessage: title,
    commitSha: `issue-${issue.number}`,
    fileName: 'GitHub Issue',
    status: 'success',
    metadata: {
      badgeAction: 'quickdraw',
      issueNumber: issue.number,
      executedTime: new Date()
    }
  });

  return issue;
};

export const runPrCycle = async (automation) => {
  const token = await getGitHubTokenForUser(automation.userId);
  if (!token) throw new Error('GitHub account is not connected');

  const repo = await getRepository(token, automation.repoOwner, automation.repoName);
  const baseBranch = repo.default_branch || 'main';
  const base = await getBranch(token, automation.repoOwner, automation.repoName, baseBranch);
  const branchName = `autogit/badge-${Date.now()}`;
  await createBranch(token, automation.repoOwner, automation.repoName, branchName, base.commit.sha);

  const targetFile = automation.targetFile || 'README.md';
  const { content, sha } = await getFileContent(token, automation.repoOwner, automation.repoName, targetFile);
  const trailer = automation.badgeAutomation?.includeCoAuthor && automation.userId?.altGitHubUsername
    ? `\n\nCo-authored-by: ${automation.userId.altGitHubUsername} <${automation.userId.altGitHubEmail || `${automation.userId.altGitHubUsername}@users.noreply.github.com`}>`
    : '';
  const message = `chore: automated badge contribution${trailer}`;
  const nextContent = `${content}\n<!-- AutoGit badge PR ${new Date().toISOString()} -->`;

  await createOrUpdateFile(
    token,
    automation.repoOwner,
    automation.repoName,
    targetFile,
    nextContent,
    message,
    sha,
    branchName
  );

  const pr = await createPullRequest(token, automation.repoOwner, automation.repoName, {
    title: `AutoGit badge contribution ${new Date().toLocaleDateString('en-IN')}`,
    body: 'Automated selected-repo contribution from AutoGit.',
    head: branchName,
    base: baseBranch
  });

  const merge = await mergePullRequest(
    token,
    automation.repoOwner,
    automation.repoName,
    pr.number,
    'chore: merge AutoGit badge contribution'
  );

  await deleteBranch(token, automation.repoOwner, automation.repoName, branchName).catch(() => {});

  await CommitLog.create({
    automationId: automation._id,
    userId: automation.userId._id || automation.userId,
    repoName: automation.repoName,
    commitMessage: message,
    commitSha: merge.sha || pr.merge_commit_sha || `pr-${pr.number}`,
    fileName: targetFile,
    status: 'success',
    metadata: {
      badgeAction: 'pr_cycle',
      pullNumber: pr.number,
      coAuthored: Boolean(trailer),
      executedTime: new Date()
    }
  });

  return { pr, merge };
};
