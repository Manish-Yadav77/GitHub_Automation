// Fixed GitHub Utilities - src/utils/github.js
import axios from 'axios';
import User from '../models/User.js';

// Get GitHub access token from code
export const getGitHubAccessToken = async (code) => {
  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    console.log('GitHub token response:', response.data);

    if (response.data.error) {
      throw new Error(`GitHub OAuth Error: ${response.data.error_description || response.data.error}`);
    }

    if (!response.data.access_token) {
      throw new Error('No access token received from GitHub');
    }

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting GitHub access token:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
};

// Get GitHub user information
export const getGitHubUser = async (accessToken) => {
  try {
    console.log('Getting GitHub user with token:', accessToken ? 'Token exists' : 'No token');
    
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`, // Changed from 'token' to 'Bearer'
        'User-Agent': 'GitHub-Automation-App'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting GitHub user:', error.response?.data || error.message);
    throw new Error('Failed to get user information');
  }
};

// Get user email from GitHub (sometimes email is private)
export const getGitHubUserEmails = async (accessToken) => {
  try {
    const response = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Automation-App'
      }
    });

    // Find primary email
    const primaryEmail = response.data.find(email => email.primary);
    return primaryEmail ? primaryEmail.email : response.data[0]?.email || null;
  } catch (error) {
    console.error('Error getting GitHub user emails:', error.response?.data || error.message);
    return null;
  }
};

// Get user repositories
export const getUserRepositories = async (accessToken) => {
  try {
    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Automation-App'
      },
      params: {
        sort: 'updated',
        per_page: 100
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting repositories:', error.response?.data || error.message);
    throw new Error('Failed to get repositories');
  }
};

// Get repository contents
export const getRepositoryContents = async (accessToken, owner, repo, path = '') => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Automation-App'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error getting repository contents:', error.response?.data || error.message);
    throw new Error('Failed to get repository contents');
  }
};

// Create or update file in repository
export const createOrUpdateFile = async (accessToken, owner, repo, path, content, message, sha = null, branch = 'main') => {
  try {
    const data = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch
      // Do NOT set committer/author to let GitHub attribute to token owner
    };

    if (sha) data.sha = sha;

    const response = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'GitHub-Automation-App'
        }
      }
    );

    // Optional: log author email/login from response for verification
    // console.log(response.data.commit?.author, response.data.commit?.committer);

    return response.data;
  } catch (error) {
    console.error('Error creating/updating file:', error.response?.data || error.message);
    throw new Error('Failed to create/update file');
  }
};

// Get file content and SHA
export const getFileContent = async (accessToken, owner, repo, path) => {
  try {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Automation-App'
      }
    });

    return {
      content: Buffer.from(response.data.content, 'base64').toString(),
      sha: response.data.sha
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return {
        content: '',
        sha: null
      };
    }
    console.error('Error getting file content:', error.response?.data || error.message);
    throw new Error('Failed to get file content');
  }
};

// Generate random commit content
export const generateCommitContent = (phrases, existingContent) => {
  const timestamp = new Date().toISOString();
  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
  const comment = `<!-- ${randomPhrase} - ${timestamp} -->`;
  return existingContent + `\n${comment}`;
};

// Token validation with error handling
export const validateGitHubToken = async (accessToken) => {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitHub-Automation-App'
      }
    });
    return { valid: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ GitHub token is invalid or expired');
      return { valid: false, reason: 'Token expired or invalid' };
    }
    return { valid: false, reason: error.message };
  }
};

// Retry wrapper for GitHub API calls with token validation
export const withTokenValidation = async (apiCall, userId, accessToken) => {
  try {
    return await apiCall(accessToken);
  } catch (error) {
    // Check if it's a 401 (unauthorized) error
    if (error.response?.status === 401) {
      console.error(`⚠️  Token invalid for user ${userId}, may need re-authentication`);
      // In future: implement token refresh from refresh token
      // For now, log the error so admin can see and request re-auth
      throw new Error(`GitHub token expired. Please re-authenticate on AutoGit.`);
    }
    throw error;
  }
};
