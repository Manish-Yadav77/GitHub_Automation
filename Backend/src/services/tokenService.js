import User from '../models/User.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.js';

export const storeGitHubToken = (user, token) => {
  const tokenData = encryptSecret(token);
  user.githubTokenEncrypted = tokenData.encrypted;
  user.githubTokenIv = tokenData.iv;
  user.githubTokenTag = tokenData.tag;
  user.githubAccessToken = undefined;
};

export const getGitHubTokenForUser = async (userId) => {
  const user = await User.findById(userId).select(
    '+githubTokenEncrypted +githubTokenIv +githubTokenTag +githubAccessToken'
  );

  if (!user) return null;

  if (user.githubTokenEncrypted) {
    return decryptSecret({
      encrypted: user.githubTokenEncrypted,
      iv: user.githubTokenIv,
      tag: user.githubTokenTag
    });
  }

  return user.githubAccessToken || null;
};
