import React from 'react';

export const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

export const PageSkeleton = ({ rows = 6 }) => (
  <div className="min-h-screen bg-gray-50 pt-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <SkeletonBlock className="h-8 w-56 mb-3" />
        <SkeletonBlock className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10" />
              <div className="flex-1">
                <SkeletonBlock className="h-4 w-32 mb-2" />
                <SkeletonBlock className="h-3 w-20" />
              </div>
            </div>
            <SkeletonBlock className="h-2 w-full mt-5" />
            <SkeletonBlock className="h-4 w-full mt-5" />
            <SkeletonBlock className="h-4 w-3/4 mt-2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);
