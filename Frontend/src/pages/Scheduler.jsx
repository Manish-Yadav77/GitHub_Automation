import React, { useEffect, useState } from 'react';
import { CalendarClock, RefreshCw, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/axios';
import LoadingScreen from '../components/LoadingScreen';

const Scheduler = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const loadJobs = async () => {
    try {
      const response = await api.get('/api/jobs');
      setJobs(response.data.jobs || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const generateToday = async () => {
    try {
      setWorking(true);
      const response = await api.post('/api/jobs/generate-today');
      setJobs(response.data.jobs || []);
      toast.success('Today jobs generated');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate jobs');
    } finally {
      setWorking(false);
    }
  };

  const retryJob = async (id) => {
    try {
      setWorking(true);
      await api.post(`/api/jobs/${id}/retry`);
      await loadJobs();
      toast.success('Job retried');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Retry failed');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Scheduler</h1>
            <p className="text-gray-600 mt-1">Persisted jobs for your selected repository.</p>
          </div>
          <button
            onClick={generateToday}
            disabled={working}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${working ? 'animate-spin' : ''}`} />
            Generate Today
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <CalendarClock className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">No jobs yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <div key={job._id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{job.type}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">{job.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {job.automationId?.repoOwner}/{job.automationId?.repoName || 'selected repo'} at {new Date(job.scheduledAt).toLocaleString()}
                    </p>
                    {job.errorMessage && <p className="text-sm text-red-600 mt-1">{job.errorMessage}</p>}
                  </div>
                  {job.status === 'failed' && (
                    <button
                      onClick={() => retryJob(job._id)}
                      disabled={working}
                      className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scheduler;
