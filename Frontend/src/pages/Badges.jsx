import React, { useEffect, useMemo, useState } from 'react';
import { Award, GitPullRequest, HelpCircle, RefreshCw, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/axios';
import { PageSkeleton } from '../components/Skeleton';

const iconMap = {
  pull_shark: GitPullRequest,
  yolo: ShieldCheck,
  quickdraw: Zap,
  pair_extraordinaire: Award,
  galaxy_brain: HelpCircle,
  starstruck: Star,
  public_sponsor: Sparkles
};

const tierGoal = (badge) => {
  const thresholds = badge.thresholds || {};
  return thresholds.gold || thresholds.silver || thresholds.bronze || thresholds.default || 1;
};

const Badges = () => {
  const [badges, setBadges] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [triggering, setTriggering] = useState('');

  const progressByName = useMemo(() => Object.fromEntries(progress.map(item => [item.badgeName, item])), [progress]);

  const loadBadges = async () => {
    try {
      const response = await api.get('/api/badges');
      setBadges(response.data.badges || []);
      setProgress(response.data.progress || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const refresh = async () => {
    try {
      setRefreshing(true);
      const response = await api.post('/api/badges/refresh', {});
      setProgress(response.data.progress || []);
      toast.success('Badge progress refreshed');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Refresh is rate limited');
    } finally {
      setRefreshing(false);
    }
  };

  const trigger = async (type) => {
    try {
      setTriggering(type);
      const response = await api.post(`/api/badges/trigger/${type}`, {});
      toast.success(response.data.message || 'Badge action completed');
      await loadBadges();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Badge action failed');
    } finally {
      setTriggering('');
    }
  };

  if (loading) return <PageSkeleton rows={7} />;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Badge Tracker</h1>
            <p className="text-gray-600 mt-1">Free, single-account safe workflows for your selected repository.</p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {badges.map((badge) => {
            const row = progressByName[badge.name] || {};
            const Icon = iconMap[badge.name] || Award;
            const goal = tierGoal(badge);
            const count = row.currentCount || 0;
            const percent = Math.min(100, Math.round((count / goal) * 100));
            const manual = row.tier === 'manual' || row.metadata?.manual;

            return (
              <div key={badge.name} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{badge.label}</h2>
                      <p className="text-xs uppercase tracking-wide text-gray-500">{row.tier || 'none'}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{count}/{goal}</span>
                </div>

                <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${percent}%` }} />
                </div>

                <p className="mt-4 text-sm text-gray-600 min-h-[60px]">{badge.automation}</p>

                {badge.name === 'quickdraw' && (
                  <button
                    onClick={() => trigger('quickdraw')}
                    disabled={triggering === 'quickdraw'}
                    className="mt-4 w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
                  >
                    {triggering === 'quickdraw' ? 'Working...' : 'Run Quickdraw'}
                  </button>
                )}

                {badge.name === 'pull_shark' && (
                  <button
                    onClick={() => trigger('pr_cycle')}
                    disabled={triggering === 'pr_cycle'}
                    className="mt-4 w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
                  >
                    {triggering === 'pr_cycle' ? 'Working...' : 'Run PR Cycle'}
                  </button>
                )}

                {manual && (
                  <div className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Manual step required on GitHub.
                  </div>
                )}

                {row.metadata?.shareUrl && (
                  <a
                    href={row.metadata.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900"
                  >
                    Open selected repo
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Badges;
