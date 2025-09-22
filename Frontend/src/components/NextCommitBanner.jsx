// src/components/NextCommitBanner.jsx
import React, { useMemo } from 'react';

function inWindow(schedule, timeRange, now = new Date()) {
  if (!schedule?.daysOfWeek || !Array.isArray(schedule.daysOfWeek)) return false;
  const day = now.getDay(); // 0=Sun .. 6=Sat
  if (!schedule.daysOfWeek.includes(day)) return false;

  const [sh, sm] = (timeRange?.startTime || '09:00').split(':').map(Number);
  const [eh, em] = (timeRange?.endTime || '17:00').split(':').map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  return cur >= start && cur <= end;
}

function fmtHM(str) {
  if (!str) return '';
  const [h, m] = str.split(':').map(Number);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function NextCommitBanner({ automation }) {
  const active = useMemo(() => {
    if (!automation) return false;
    return inWindow(automation.schedule, automation.timeRange, new Date());
  }, [automation]);

  if (!automation || !active) return null;

  const nextCheck = '~1 min'; // server cron runs roughly every minute
  const until = fmtHM(automation?.timeRange?.endTime);
  const phrases = Array.isArray(automation?.commitPhrases) ? automation.commitPhrases : [];
  const preview = phrases.length ? phrases[Math.floor(Math.random() * phrases.length)] : 'Scheduled commit';

  return (
    <div className="sticky top-0 z-20 mb-3 sm:mb-4 md:mb-5 rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm sm:text-[0.95rem] md:text-base">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Next commit check:</span>
        <span>{nextCheck}</span>
        <span className="hidden sm:inline">•</span>
        <span className="w-full sm:w-auto">Window active until {until}</span>
        {phrases.length > 0 && (
          <>
            <span className="hidden sm:inline">•</span>
            <span className="w-full sm:w-auto">Likely: “{preview}”</span>
          </>
        )}
      </div>
    </div>
  );
}
