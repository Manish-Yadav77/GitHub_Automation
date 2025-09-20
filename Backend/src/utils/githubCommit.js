// GitHub Commit Automation - src/utils/githubCommit.js
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

    // Find active automations that should run now
    const activeAutomations = await Automation.find({
      status: "active",
      "schedule.daysOfWeek": currentDay,
    }).populate("userId");

    for (const automation of activeAutomations) {
      try {
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

        if (
          currentTotalMinutes < startTotalMinutes ||
          currentTotalMinutes > endTotalMinutes
        ) {
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

        // Determine if we should make a commit (random chance)
        const maxCommits = automation.maxCommitsPerDay;
        // const shouldCommit =
        //   Math.random() < 1 / ((endTotalMinutes - startTotalMinutes) / 60) &&
        //   todayCommits < maxCommits;
          
        // const shouldCommit = todayCommits === 0 || (todayCommits < maxCommits && Math.random() < 0.3);

        
        // Ensure we're inside the selected window
const inWindow =
  currentTotalMinutes >= startTotalMinutes &&
  currentTotalMinutes <= endTotalMinutes;

// Deterministic test mode: if testing is enabled, always commit on the first eligible tick in the window,
// regardless of earlier commits today. Turn this on temporarily during debugging.
const testingMode = true; // set to false after verifying end-to-end

// Cap enforcement: never exceed maxCommitsPerDay
const underCap = todayCommits < maxCommits;

// Hybrid logic:
// - If testingMode: commit as soon as we're in the window and under daily cap.
// - Otherwise: guarantee one commit per day, then use 30% chance for additional commits, all within the window and under cap.
const shouldCommit =
  inWindow &&
  underCap &&
  (
    testingMode
      ? true
      : (todayCommits === 0 || Math.random() < 0.3)
  );



        if (!shouldCommit) {
          continue;
        }

        // Get user's GitHub token
        const user = await User.findById(automation.userId).select(
          "+githubAccessToken"
        );
        if (!user || !user.githubAccessToken) {
          console.log(`No GitHub token for automation ${automation._id}`);
          continue;
        }

        // Execute the commit
        await executeCommit(automation, user.githubAccessToken);
      } catch (error) {
        console.error(`Error processing automation ${automation._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in executeScheduledCommits:", error);
  }
};

const executeCommit = async (automation, accessToken) => {
  try {
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

    // Get current file content
    const { content: currentContent, sha } = await getFileContent(
      accessToken,
      automation.repoOwner,
      automation.repoName,
      automation.targetFile
    );

    // Generate new content
    const newContent = generateCommitContent([randomPhrase], currentContent);

    // Create commit
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

    console.log(
      `Commit successful for automation ${automation._id}: ${randomPhrase}`
    );
  } catch (error) {
    console.error(`Commit failed for automation ${automation._id}:`, error);

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
  }
};
