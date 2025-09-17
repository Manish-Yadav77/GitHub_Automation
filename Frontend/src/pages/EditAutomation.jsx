// Edit Automation Page - src/pages/EditAutomation.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Github, Clock, Settings, MessageSquare, Save, Trash2 } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const EditAutomation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [repositories, setRepositories] = useState([]);
  const [formData, setFormData] = useState({
    repoName: '',
    repoOwner: '',
    isPrivate: false,
    targetFile: 'README.md',
    maxCommitsPerDay: 3,
    timeRange: {
      startTime: '09:00',
      endTime: '17:00'
    },
    commitPhrases: [
      'Update documentation',
      'Improve code quality',
      'Fix minor issues'
    ],
    schedule: {
      daysOfWeek: [1, 2, 3, 4, 5] // Monday to Friday
    },
    status: 'active'
  });

  const [customPhrase, setCustomPhrase] = useState('');

  useEffect(() => {
    Promise.all([fetchAutomation(), fetchRepositories()]);
  }, [id]);

  const fetchAutomation = async () => {
    try {
      const response = await axios.get(`/api/automation/${id}`);
      const automation = response.data.automation;
      
      setFormData({
        repoName: automation.repoName,
        repoOwner: automation.repoOwner,
        isPrivate: automation.isPrivate,
        targetFile: automation.targetFile,
        maxCommitsPerDay: automation.maxCommitsPerDay,
        timeRange: automation.timeRange,
        commitPhrases: automation.commitPhrases,
        schedule: automation.schedule,
        status: automation.status
      });
    } catch (error) {
      console.error('Error fetching automation:', error);
      toast.error('Failed to load automation details');
      navigate('/dashboard');
    }
  };

  const fetchRepositories = async () => {
    try {
      const response = await axios.get('/api/repos');
      setRepositories(response.data.repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      toast.error('Failed to load repositories');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleRepoSelect = (e) => {
    const selectedRepo = repositories.find(repo => repo.full_name === e.target.value);
    if (selectedRepo) {
      setFormData(prev => ({
        ...prev,
        repoName: selectedRepo.name,
        repoOwner: selectedRepo.owner.login,
        isPrivate: selectedRepo.private
      }));
    }
  };

  const addCustomPhrase = () => {
    if (customPhrase.trim() && formData.commitPhrases.length < 5) {
      setFormData(prev => ({
        ...prev,
        commitPhrases: [...prev.commitPhrases, customPhrase.trim()]
      }));
      setCustomPhrase('');
    }
  };

  const removePhrase = (index) => {
    setFormData(prev => ({
      ...prev,
      commitPhrases: prev.commitPhrases.filter((_, i) => i !== index)
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: prev.schedule.daysOfWeek.includes(day)
          ? prev.schedule.daysOfWeek.filter(d => d !== day)
          : [...prev.schedule.daysOfWeek, day]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.repoName) {
      toast.error('Please select a repository');
      return;
    }

    if (formData.commitPhrases.length === 0) {
      toast.error('Please add at least one commit phrase');
      return;
    }

    if (formData.schedule.daysOfWeek.length === 0) {
      toast.error('Please select at least one day of the week');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/automation/${id}`, formData);
      toast.success('Automation updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating automation:', error);
      toast.error(error.response?.data?.error || 'Failed to update automation');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`/api/automation/${id}`);
      toast.success('Automation deleted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting automation:', error);
      toast.error('Failed to delete automation');
    } finally {
      setLoading(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Automation</h1>
              <p className="text-gray-600 mt-1">Update your GitHub commit automation rule</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : formData.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {formData.status}
              </span>
              <button
                onClick={handleDelete}
                className="flex items-center px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Repository Selection */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Github className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Repository Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repository
                </label>
                <select
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={`${formData.repoOwner}/${formData.repoName}`}
                  onChange={handleRepoSelect}
                  required
                >
                  <option value="">Choose a repository</option>
                  {repositories.map(repo => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.private ? '(Private)' : '(Public)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target File
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.targetFile}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetFile: e.target.value }))}
                  placeholder="README.md"
                />
                <p className="mt-1 text-sm text-gray-500">
                  The file where commits will be made (e.g., README.md, docs/log.md)
                </p>
              </div>
            </div>
          </div>

          {/* Schedule Settings */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Schedule Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.timeRange.startTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    timeRange: { ...prev.timeRange, startTime: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.timeRange.endTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    timeRange: { ...prev.timeRange, endTime: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleDayToggle(index)}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      formData.schedule.daysOfWeek.includes(index)
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Commit Settings */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Commit Settings</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Commits Per Day
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.maxCommitsPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, maxCommitsPerDay: parseInt(e.target.value) }))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                The system will randomly commit between 1 and this number each day
              </p>
            </div>
          </div>

          {/* Commit Phrases */}
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Commit Messages</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Phrases ({formData.commitPhrases.length}/5)
                </label>
                <div className="space-y-2">
                  {formData.commitPhrases.map((phrase, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                      <span className="text-sm text-gray-700">{phrase}</span>
                      <button
                        type="button"
                        onClick={() => removePhrase(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {formData.commitPhrases.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter custom commit message"
                    value={customPhrase}
                    onChange={(e) => setCustomPhrase(e.target.value)}
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={addCustomPhrase}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Updating...' : 'Update Automation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAutomation;