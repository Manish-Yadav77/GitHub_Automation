// Profile Page - src/pages/Profile.jsx
import React, { useMemo, useState } from 'react';
import { User as UserIcon, Mail, Github, Shield, Camera, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Derive GitHub connection status robustly
  const githubConnected = useMemo(() => {
    // Consider connected if there is a githubId or githubUsername or explicit flag
    return Boolean(user?.githubId || user?.githubUsername || user?.githubConnected);
  }, [user]);

  const avatarSrc = useMemo(() => {
    if (user?.avatar) return user.avatar;
    const name = user?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3B82F6&color=white`;
  }, [user]);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.patch('/api/user/profile', formData);
      // Support both {user: {...}} or direct user payload
      const updated = response.data?.user ?? response.data;
      updateUser(updated);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!window.confirm('Disconnect GitHub? Active automations using GitHub will stop.')) return;
    try {
      await axios.post('/api/user/disconnect-github');
      // Clear GitHub linkage locally
      updateUser({ githubConnected: false, githubUsername: null, githubId: null });
      toast.success('GitHub account disconnected');
    } catch {
      toast.error('Failed to disconnect GitHub account');
    }
  };

  const handleConnectGitHub = () => {
    // Start OAuth by redirecting to GitHub (same pattern as Login page)
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'user:email,read:user,repo';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}`;
  };

  // Derived account stats
  const createdAtText = formatDate(user?.createdAt);
  const planText = user?.plan ? String(user.plan) : 'free';
  const verifiedText = user?.isVerified ? 'Verified' : 'Unverified';

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-4 sm:px-6 md:px-8 py-4 border-b border-gray-200">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Manage your account information and preferences
            </p>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            {/* Header: Avatar + Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
              <div className="relative">
                <img
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-2 ring-blue-100"
                  src={avatarSrc}
                  alt={user?.username || 'User'}
                />
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 shadow"
                  title="Change avatar"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  {user?.username}
                </h2>
                <p className="text-gray-600 truncate">{user?.email}</p>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Shield className="h-4 w-4 mr-1" />
                  {planText} plan
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      value={formData.username}
                      onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                      placeholder="Your username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>

            {/* Connected Accounts */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h3>

              <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center min-w-0">
                    <Github className="h-7 w-7 sm:h-8 sm:w-8 text-gray-900 mr-3 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        GitHub
                        {githubConnected && user?.githubUsername && (
                          <a
                            href={`https://github.com/${user.githubUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-blue-600 hover:underline text-xs sm:text-sm"
                            title="Open GitHub profile"
                          >
                            <LinkIcon className="h-3.5 w-3.5 mr-1" />
                            @{user.githubUsername}
                          </a>
                        )}
                      </p>
                      {githubConnected ? (
                        <p className="text-sm text-green-600 truncate">
                          Connected{user?.githubUsername ? ` as @${user.githubUsername}` : ''}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>

                  {githubConnected ? (
                    <button
                      onClick={handleDisconnectGitHub}
                      className="px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGitHub}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">Member Since</p>
                  <p className="text-lg font-semibold text-blue-900">{createdAtText}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">Plan</p>
                  <p className="text-lg font-semibold text-green-900 capitalize">{planText}</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">Status</p>
                  <p className="text-lg font-semibold text-purple-900">{verifiedText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile spacing from footer */}
        <div className="h-6 sm:h-8" />
      </div>
    </div>
  );
};

export default Profile;
