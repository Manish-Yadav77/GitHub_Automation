// Profile Page - src/pages/Profile.jsx
import React, { useState } from 'react';
import { User, Mail, Github, Calendar, Shield, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.patch('/api/user/profile', formData);
      updateUser(response.data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!window.confirm('Are you sure you want to disconnect your GitHub account? This will stop all active automations.')) {
      return;
    }

    try {
      await axios.post('/api/user/disconnect-github');
      updateUser({ githubConnected: false, githubUsername: null });
      toast.success('GitHub account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect GitHub account');
    }
  };

  if(user.createdAt){
    console.log(new Date(user.createdAt).toISOString().replace("Z", "+00:00"))
    console.log(new Date(user.createdAt).toISOString())
    console.log("above console \n")
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information and preferences</p>
          </div>

          <div className="p-6">
            {/* Profile Picture */}
            <div className="flex items-center mb-8">
              <div className="relative">
                <img
                  className="h-20 w-20 rounded-full object-cover"
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=3B82F6&color=white`}
                  alt={user?.username}
                />
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="ml-6">
                <h2 className="text-xl font-semibold text-gray-900">{user?.username}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <p className="text-sm text-gray-500 flex items-center mt-1">
                  <Shield className="h-4 w-4 mr-1" />
                  {user?.plan} plan
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
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
                      className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>

            {/* GitHub Connection */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h3>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Github className="h-8 w-8 text-gray-900 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">GitHub</p>
                      {user?.githubConnected ? (
                        <p className="text-sm text-green-600">
                          Connected as @{user.githubUsername}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>

                  {user?.githubConnected ? (
                    <button
                      onClick={handleDisconnectGitHub}
                      className="px-3 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-600">Member Since</p>
                  <p className="text-lg font-semibold text-blue-900">
                    {user?.createdAt
                      ? new Date(user.createdAt).toISOString().replace("Z", "+00:00")
                      : "no date found.."}
                  </p>

                  {user?.createdAt &&
                    console.log(new Date(user.createdAt).toISOString().replace("Z", "+00:00"))}
                </div>


                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-600">Plan</p>
                  <p className="text-lg font-semibold text-green-900 capitalize">
                    {user?.plan}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-600">Status</p>
                  <p className="text-lg font-semibold text-purple-900">
                    {user?.isVerified ? 'Verified' : 'Unverified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;