import React from 'react';

export const PostSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden p-4 space-y-4 pulse-slow">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-border rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-border rounded w-1/3" />
          <div className="h-2 bg-border rounded w-1/4" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-2">
        <div className="h-3.5 bg-border rounded w-full" />
        <div className="h-3.5 bg-border rounded w-5/6" />
        <div className="h-3 bg-border rounded w-2/3" />
      </div>
      {/* Image box */}
      <div className="h-48 bg-border rounded-xl w-full" />
      {/* Actions */}
      <div className="flex justify-between items-center border-t border-border pt-4">
        <div className="flex gap-4">
          <div className="h-4 bg-border rounded w-12" />
          <div className="h-4 bg-border rounded w-12" />
        </div>
        <div className="h-4 bg-border rounded w-8" />
      </div>
    </div>
  );
};

export const ProfileSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadowpulse-slow">
      <div className="h-32 bg-border w-full animate-pulse" />
      <div className="p-6 flex flex-col items-center -mt-16 space-y-3">
        <div className="h-24 w-24 rounded-full border-4 border-card bg-border" />
        <div className="h-4 bg-border rounded w-1/3" />
        <div className="h-3 bg-border rounded w-1/4" />
        <div className="h-2 bg-border rounded w-1/2" />
        <div className="flex gap-4 w-full pt-4 justify-center">
          <div className="h-8 bg-border rounded-xl w-24" />
          <div className="h-8 bg-border rounded-xl w-24" />
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => {
  return <PostSkeleton />;
};

export default LoadingSkeleton;
