import React from 'react';

/**
 * Base animated shimmer skeleton box
 */
export function Skeleton({ className = '', variant = 'rectangular' }) {
  const variantClasses = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4 my-1',
  };

  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${
        variantClasses[variant] || 'rounded-xl'
      } ${className}`}
    />
  );
}

/**
 * Skeleton for Market Cards (e.g. Mandi prices, Buyer listings)
 */
export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10" variant="circular" />
              <div className="space-y-1.5">
                <Skeleton className="w-28 h-4" />
                <Skeleton className="w-20 h-3" />
              </div>
            </div>
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-50">
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-3/4 h-3" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Skeleton className="w-24 h-6" />
            <Skeleton className="w-20 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Buyer Procurement Requests on Dashboard
 */
export function BuyerRequestSkeleton({ count = 2 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="w-40 h-5" />
                <Skeleton className="w-32 h-4" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="w-20 h-3 ml-auto" />
              <Skeleton className="w-24 h-7 ml-auto" />
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <Skeleton className="w-48 h-3" />
            <Skeleton className="w-24 h-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Deal Tracker (5-stage verification)
 */
export function DealTrackerSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-48 h-6" />
          <Skeleton className="w-32 h-4" />
        </div>
        <Skeleton className="w-28 h-8 rounded-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="w-16 h-3" />
            <Skeleton className="w-24 h-5" />
          </div>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Skeleton className="w-full h-10 rounded-xl" />
        <Skeleton className="w-full h-24 rounded-xl" />
      </div>
    </div>
  );
}
