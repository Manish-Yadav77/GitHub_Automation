// Fixed Dashboard Component - src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Play,
  Pause,
  Square,
  Edit,
  Trash2,
  GitBranch,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import NextCommitBanner from '../components/NextCommitBanner';

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://github-automation-8d48.onrender.com';
axios.defaults.baseURL = API_BASE_URL;

// Add authorization header to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const Dashboard = () => {
  const [automations, setAutomations] = useState([]);
  const [stats, setStats] = useState({
    totalAutomations: 0,
    activeAutomations: 0,
    totalCommits: 0,
    commitsThisWeek: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching dashboard data...');
      setLoading(true);

      // Make API calls with proper error handling
      const [automationsRes, statsRes] = await Promise.all([
        axios.get('/api/automation').catch(error => {
          console.error('Error fetching automations:', error.response?.data || error.message);
          throw error;
        }),
        axios.get('/api/automation/stats').catch(error => {
          console.error('Error fetching stats:', error.response?.data || error.message);
          throw error;
        })
      ]);

      console.log('Automations response:', automationsRes.data);
      console.log('Stats response:', statsRes.data);

      setAutomations(automationsRes.data.automations || []);
      setStats(statsRes.data || {
        totalAutomations: 0,
        activeAutomations: 0,
        totalCommits: 0,
        commitsThisWeek: 0
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error(`Failed to load dashboard data: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (automationId, newStatus) => {
    try {
      console.log(`Changing automation ${automationId} status to ${newStatus}`);

      const response = await axios.patch(`/api/automation/${automationId}/status`, {
        status: newStatus
      });

      console.log('Status change response:', response.data);

      setAutomations(prev =>
        prev.map(auto =>
          auto._id === automationId
            ? { ...auto, status: newStatus }
            : auto
        )
      );
      toast.success(`Automation ${newStatus}`);
    } catch (error) {
      console.error('Error updating automation status:', error);
      toast.error(`Failed to update automation: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDelete = async (automationId) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) {
      return;
    }

    try {
      console.log(`Deleting automation ${automationId}`);

      await axios.delete(`/api/automation/${automationId}`);

      setAutomations(prev => prev.filter(auto => auto._id !== automationId));
      toast.success('Automation deleted successfully');
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error(`Failed to delete automation: ${error.response?.data?.error || error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your GitHub automation rules</p>
          </div>
          <Link
            to="/create-automation"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Automation
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GitBranch className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rules</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAutomations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeAutomations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCommits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.commitsThisWeek}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Automations List */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Automation Rules</h2>
          </div>

          {automations.length === 0 ? (
            <div className="text-center px-4 py-10 sm:py-12">
              <GitBranch className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">No automations</h3>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Get started by creating your first automation rule.
              </p>
              <div className="mt-5 sm:mt-6">
                <Link
                  to="/create-automation"
                  className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {automations.map((automation) => (
                <div key={automation._id} className="px-3 sm:px-4 md:px-6 py-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
                    {/* Left: Repo + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="text-sm sm:text-[0.95rem] md:text-base font-medium text-gray-900 truncate">
                          {automation.repoOwner}/{automation.repoName}
                        </h3>
                        <span
                          className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${getStatusColor(automation.status)}`}
                        >
                          {automation.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <Clock className="flex-shrink-0 mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          {automation.timeRange?.startTime} - {automation.timeRange?.endTime}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>Max {automation.maxCommitsPerDay} commits/day</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{automation.targetFile}</span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="md:ml-4 flex flex-wrap items-center justify-start md:justify-end gap-1.5 sm:gap-2">
                      {automation.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(automation._id, 'paused')}
                          className="p-1.5 rounded text-gray-500 hover:text-yellow-600 hover:bg-gray-50"
                          title="Pause"
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(automation._id, 'active')}
                          className="p-1.5 rounded text-gray-500 hover:text-green-600 hover:bg-gray-50"
                          title="Start"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleStatusChange(automation._id, 'stopped')}
                        className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-gray-50"
                        title="Stop"
                      >
                        <Square className="h-4 w-4" />
                      </button>

                      <Link
                        to={`/edit-automation/${automation._id}`}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-50"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      <button
                        onClick={() => handleDelete(automation._id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-gray-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-sm text-gray-600">
                      <span className="font-medium">Stats:</span>
                      <span>{automation.statistics?.totalCommits || 0} total commits</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{automation.statistics?.commitsThisWeek || 0} this week</span>
                      {automation.lastCommit && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            Last: {new Date(automation.lastCommit.timestamp).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Display Commits Data */}
        <NextCommitBanner />

      </div>
    </div>
  );
};

export default Dashboard;