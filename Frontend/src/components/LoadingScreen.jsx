// src/components/LoadingScreen.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const routeTitles = {
  '/dashboard': 'Dashboard',
  '/profile': 'Profile Settings',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

const slogans = [
  'Auto-magic in progress...',
  'Aligning your commits...',
  'Warming up the bots...',
  'Fetching automation rules...',
  'Calibrating cron jobs...',
  'Checking GitHub tokens...',
];

export default function LoadingScreen() {
  const { pathname } = useLocation();
  const page = routeTitles[pathname] || 'App';
  const { user } = useAuth();

  const [slogan, setSlogan] = useState(slogans[0]);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const slowFillRef = useRef(null);

  // Cycle slogans every 3 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setSlogan(slogans[Math.floor(Math.random() * slogans.length)]);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // Start slow fill interval
  useEffect(() => {
    slowFillRef.current = setInterval(() => {
      setProgress((p) => (p < 95 ? p + Math.random() * 5 : p));
    }, 200);
    return () => clearInterval(slowFillRef.current);
  }, []);

  // When user arrives, jump to 100%, clear slow fill, then fade out
  useEffect(() => {
    if (user) {
      clearInterval(slowFillRef.current);
      setProgress(100);
      const tid = setTimeout(() => setVisible(false), 800);
      return () => clearTimeout(tid);
    }
  }, [user]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-tr from-indigo-100 to-purple-100 overflow-hidden transition-opacity duration-500 ease-out">
      {/* Particle Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <span
            key={i}
            className={`absolute bg-white rounded-full opacity-20 animate-float delay-${i % 5}s`}
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Bouncing Logo */}
      <div className="relative z-10">
        <div className="animate-bounce-slow inline-block p-4 bg-white rounded-full shadow-xl">
          <svg
            className="h-16 w-16 text-indigo-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0L15.09 7.36L23 8.51L17 13.97L18.18 21.9L12 18L5.82 21.9L7 13.97L1 8.51L8.91 7.36L12 0Z" />
          </svg>
        </div>
      </div>

      {/* Header Text */}
      <h2 className="z-10 mt-6 text-2xl sm:text-3xl font-extrabold text-indigo-700">
        Loading {page}
      </h2>

      {/* Slogan */}
      <p className="z-10 mt-2 text-indigo-500 italic">{slogan}</p>

      {/* Progress Bar */}
      <div className="z-10 mt-6 w-64 sm:w-80 h-2 bg-white rounded-full overflow-hidden shadow-inner">
        <div
          className="h-full bg-indigo-500 transition-all duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0.2; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.4; }
          100% { transform: translateY(0) translateX(0); opacity: 0.2; }
        }
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite;
        }
        .delay-0s { animation-delay: 0s; }
        .delay-1s { animation-delay: 1s; }
        .delay-2s { animation-delay: 2s; }
        .delay-3s { animation-delay: 3s; }
        .delay-4s { animation-delay: 4s; }
      `}</style>
    </div>
  );
}
