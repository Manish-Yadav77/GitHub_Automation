// Fixed GitHub Commit Automation - src/utils/githubCommit.js

import Automation from "../models/Automation.js";
import CommitLog from "../models/CommitLog.js";
import User from "../models/User.js";
import {
  getFileContent,
  createOrUpdateFile,
  generateCommitContent,
} from "./github.js";

export const executeScheduledCommits = async () => {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentTime = `${currentHour
      .toString()
      .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

    console.log(`⏰ Checking automations at ${currentTime} on day ${currentDay}`);

    // Find active automations that should run today
    const activeAutomations = await Automation.find({
      status: "active",
      "schedule.daysOfWeek": currentDay,
    }).populate("userId");

    console.log(`📋 Found ${activeAutomations.length} active automations for today`);

    for (const automation of activeAutomations) {
      try {
        console.log(`🔍 Processing automation ${automation._id} for repo ${automation.repoOwner}/${automation.repoName}`);

        // Check if current time is within the automation's time range
        const [startHour, startMinute] = automation.timeRange.startTime
          .split(":")
          .map(Number);
        const [endHour, endMinute] = automation.timeRange.endTime
          .split(":")
          .map(Number);

        const startTotalMinutes = startHour * 60 + startMinute;
        const endTotalMinutes = endHour * 60 + endMinute;
        const currentTotalMinutes = currentHour * 60 + currentMinute;

        console.log(`⏱️  Time window: ${startTotalMinutes}-${endTotalMinutes} mins, current: ${currentTotalMinutes} mins`);

        // Check if we're within the time window
        const inWindow = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
        
        if (!inWindow) {
          console.log(`⏰ Automation ${automation._id} - Outside time window, skipping`);
          continue;
        }

        // Check if we've already made commits today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCommits = await CommitLog.countDocuments({
          automationId: automation._id,
          createdAt: { $gte: today },
          status: "success",
        });

        console.log(`📊 Today's commits: ${todayCommits}/${automation.maxCommitsPerDay}`);

        // Enhanced commit logic for better testing and guaranteed daily commits
        const maxCommits = automation.maxCommitsPerDay;
        const underCap = todayCommits < maxCommits;

        // Testing mode - more aggressive for quick testing
        const testingMode = true; // Keep this true for now to test quickly
        
        let shouldCommit = false;
        
        if (testingMode) {
          // In testing mode: commit immediately if in window and under cap
          shouldCommit = inWindow && underCap;
        } else {
          // Production mode: guarantee at least 1 commit per day, then random chance for more
          if (todayCommits === 0) {
            // Always make at least 1 commit per day if we're in the window
            shouldCommit = inWindow;
          } else if (underCap) {
            // For additional commits, use probability based on remaining time in window
            const remainingMinutes = endTotalMinutes - currentTotalMinutes;
            const remainingCommits = maxCommits - todayCommits;
            // Higher probability when fewer commits remaining or less time left
            const probability = Math.min(0.5, (remainingCommits / remainingMinutes) * 30);
            shouldCommit = inWindow && Math.random() < probability;
          }
        }

        console.log(`🎯 Should commit: ${shouldCommit} (inWindow: ${inWindow}, underCap: ${underCap}, testingMode: ${testingMode})`);

        if (!shouldCommit) {
          console.log(`⏭️  Automation ${automation._id} - Skipping commit this round`);
          continue;
        }

        // Get user's GitHub token
        const user = await User.findById(automation.userId).select(
          "+githubAccessToken"
        );

        if (!user || !user.githubAccessToken) {
          console.log(`❌ No GitHub token for automation ${automation._id}`);
          continue;
        }

        console.log(`🚀 Executing commit for automation ${automation._id}...`);

        // Execute the commit
        await executeCommit(automation, user.githubAccessToken);

      } catch (error) {
        console.error(`❌ Error processing automation ${automation._id}:`, error);
      }
    }

  } catch (error) {
    console.error("❌ Error in executeScheduledCommits:", error);
  }
};

const executeCommit = async (automation, accessToken) => {
  try {
    console.log(`📝 Creating commit for ${automation.repoOwner}/${automation.repoName}`);

    const commitLog = new CommitLog({
      automationId: automation._id,
      userId: automation.userId,
      repoName: automation.repoName,
      commitMessage: "",
      commitSha: "",
      fileName: automation.targetFile,
      status: "pending",
      metadata: {
        scheduledTime: new Date(),
        timeZone: "UTC",
        dayOfWeek: new Date().getDay(),
      },
    });

    // Get random commit phrase
    const randomPhrase =
      automation.commitPhrases[
        Math.floor(Math.random() * automation.commitPhrases.length)
      ];

    console.log(`💬 Commit message: "${randomPhrase}"`);

    // Get current file content
    console.log(`📖 Reading file: ${automation.targetFile}`);
    const { content: currentContent, sha } = await getFileContent(
      accessToken,
      automation.repoOwner,
      automation.repoName,
      automation.targetFile
    );

    // Generate new content
    const newContent = generateCommitContent([randomPhrase], currentContent);

    // Create commit
    console.log(`⬆️  Pushing commit...`);
    const result = await createOrUpdateFile(
      accessToken,
      automation.repoOwner,
      automation.repoName,
      automation.targetFile,
      newContent,
      randomPhrase,
      sha
    );

    // Update commit log
    commitLog.commitMessage = randomPhrase;
    commitLog.commitSha = result.commit.sha;
    commitLog.status = "success";
    commitLog.metadata.executedTime = new Date();
    await commitLog.save();

    // Update automation statistics
    await automation.incrementCommitCount();

    // Update last commit info
    automation.lastCommit = {
      timestamp: new Date(),
      message: randomPhrase,
      sha: result.commit.sha,
    };
    await automation.save();

    console.log(`✅ Commit successful for automation ${automation._id}: ${randomPhrase}`);
    console.log(`🔗 Commit SHA: ${result.commit.sha}`);

  } catch (error) {
    console.error(`❌ Commit failed for automation ${automation._id}:`, error);
    
    // Save error to commit log
    const errorLog = await CommitLog.findOne({
      automationId: automation._id,
      status: "pending",
    }).sort({ createdAt: -1 });

    if (errorLog) {
      errorLog.status = "failed";
      errorLog.error = {
        message: error.message,
        code: error.response?.status || "UNKNOWN",
      };
      await errorLog.save();
    }
    
    // Rethrow to ensure error is logged at higher level
    throw error;
  }
};