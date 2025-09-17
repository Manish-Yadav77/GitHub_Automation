
// Repository Routes - src/routes/repo.js
import express from 'express';
import User from '../models/User.js';
import { getUserRepositories } from '../utils/github.js';

const router = express.Router();

// Get user repositories from GitHub
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('+githubAccessToken');
    
    if (!user || !user.githubAccessToken) {
      return res.status(400).json({ 
        error: 'GitHub account not connected. Please connect your GitHub account first.' 
      });
    }

    const repositories = await getUserRepositories(user.githubAccessToken);
    
    // Filter and format repositories
    const formattedRepos = repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      owner: {
        login: repo.owner.login,
        avatar_url: repo.owner.avatar_url
      },
      description: repo.description,
      updated_at: repo.updated_at,
      language: repo.language
    }));

    res.json({ repositories: formattedRepos });
  } catch (error) {
    console.error('Get repositories error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repositories from GitHub' 
    });
  }
});

export default router;