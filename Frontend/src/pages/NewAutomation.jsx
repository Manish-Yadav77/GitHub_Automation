import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Github, 
  Clock, 
  GitBranch, 
  FileText, 
  MessageSquare,
  Plus,
  Trash2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User } from "@/entities/User";
import { Automation } from "@/entities/Automation";
import LoadingScreen from "../components/LoadingScreen";

const neomorphicStyles = {
  background: '#e0e0e0',
  boxShadow: '8px 8px 16px #bebebe, -8px -8px 16px #ffffff',
  borderRadius: '25px',
  border: 'none'
};

const neomorphicInset = {
  background: '#e0e0e0',
  boxShadow: 'inset 8px 8px 16px #bebebe, inset -8px -8px 16px #ffffff',
  borderRadius: '20px'
};

export default function NewAutomation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    repo_name: '',
    repo_owner: '',
    is_private: false,
    target_file: 'README.md',
    start_time: '09:00',
    end_time: '18:00',
    max_commits_per_day: 5,
    commit_phrases: ['Update documentation', 'Fix minor issues', 'Improve code quality']
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      if (currentUser.github_username) {
        setFormData(prev => ({
          ...prev,
          repo_owner: currentUser.github_username
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addCommitPhrase = () => {
    if (formData.commit_phrases.length < 5) {
      setFormData(prev => ({
        ...prev,
        commit_phrases: [...prev.commit_phrases, '']
      }));
    }
  };

  const updateCommitPhrase = (index, value) => {
    setFormData(prev => ({
      ...prev,
      commit_phrases: prev.commit_phrases.map((phrase, i) => 
        i === index ? value : phrase
      )
    }));
  };

  const removeCommitPhrase = (index) => {
    setFormData(prev => ({
      ...prev,
      commit_phrases: prev.commit_phrases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await Automation.create({
        ...formData,
        user_id: user.id,
        commit_phrases: formData.commit_phrases.filter(phrase => phrase.trim() !== '')
      });
      navigate(createPageUrl('Dashboard'));
    } catch (error) {
      console.error('Error creating automation:', error);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <LoadingScreen/>
    );
  }

  return (
    <div style={{ background: '#e0e0e0', minHeight: '100vh' }} className="p-8">
      <style jsx>{`
        .neomorphic {
          background: #e0e0e0;
          box-shadow: 8px 8px 16px #bebebe, -8px -8px 16px #ffffff;
          border-radius: 25px;
          border: none;
          transition: all 0.3s ease;
        }
        .neomorphic:hover {
          box-shadow: 12px 12px 24px #bebebe, -12px -12px 24px #ffffff;
        }
        .neomorphic:active {
          box-shadow: inset 4px 4px 8px #bebebe, inset -4px -4px 8px #ffffff;
        }
        .neomorphic-input {
          background: #e0e0e0;
          box-shadow: inset 6px 6px 12px #bebebe, inset -6px -6px 12px #ffffff;
          border-radius: 15px;
          border: none;
          padding: 16px 20px;
          outline: none;
          transition: all 0.3s ease;
        }
        .neomorphic-input:focus {
          box-shadow: inset 8px 8px 16px #bebebe, inset -8px -8px 16px #ffffff;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="neomorphic p-3"
            style={{ background: '#e0e0e0' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Create New Automation</h1>
            <p className="text-gray-600">Set up automated commits for your repository</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Repository Settings */}
          <div style={neomorphicStyles} className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Github className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-800">Repository Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repository Owner</label>
                <input
                  type="text"
                  value={formData.repo_owner}
                  onChange={(e) => handleInputChange('repo_owner', e.target.value)}
                  className="neomorphic-input w-full text-gray-700"
                  placeholder="your-username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
                <input
                  type="text"
                  value={formData.repo_name}
                  onChange={(e) => handleInputChange('repo_name', e.target.value)}
                  className="neomorphic-input w-full text-gray-700"
                  placeholder="my-awesome-project"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target File</label>
                <input
                  type="text"
                  value={formData.target_file}
                  onChange={(e) => handleInputChange('target_file', e.target.value)}
                  className="neomorphic-input w-full text-gray-700"
                  placeholder="README.md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Repository Type</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleInputChange('is_private', false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      !formData.is_private 
                        ? 'bg-green-100 text-green-800 shadow-inner' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    style={!formData.is_private ? neomorphicInset : {}}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('is_private', true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.is_private 
                        ? 'bg-blue-100 text-blue-800 shadow-inner' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    style={formData.is_private ? neomorphicInset : {}}
                  >
                    Private
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Settings */}
          <div style={neomorphicStyles} className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-gray-700" />
              <h2 className="text-2xl font-bold text-gray-800">Schedule Settings</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className="neomorphic-input w-full text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className="neomorphic-input w-full text-gray-700"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Commits Per Day</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.max_commits_per_day}
                  onChange={(e) => handleInputChange('max_commits_per_day', parseInt(e.target.value))}
                  className="neomorphic-input w-full text-gray-700"
                  required
                />
              </div>
            </div>

            <div style={neomorphicInset} className="p-4 mt-6">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> Commits will be made at random times between your selected hours. 
                The actual number of commits per day will vary randomly from 1 to your maximum setting.
              </p>
            </div>
          </div>

          {/* Commit Messages */}
          <div style={neomorphicStyles} className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-800">Commit Messages</h2>
              </div>
              {formData.commit_phrases.length < 5 && (
                <Button
                  type="button"
                  onClick={addCommitPhrase}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Phrase
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {formData.commit_phrases.map((phrase, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => updateCommitPhrase(index, e.target.value)}
                    className="neomorphic-input flex-1 text-gray-700"
                    placeholder={`Commit message ${index + 1}`}
                  />
                  {formData.commit_phrases.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeCommitPhrase(index)}
                      variant="ghost"
                      size="icon"
                      className="text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div style={neomorphicInset} className="p-4 mt-6">
              <p className="text-sm text-gray-600">
                These phrases will be randomly selected for each commit. 
                You can add up to 5 different commit messages to keep your commits varied and natural.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="neomorphic text-gray-800 font-semibold px-8"
              style={{ background: '#e0e0e0' }}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              {saving ? 'Creating...' : 'Create Automation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}