import React from 'react';

interface CounterBadgeProps {
  count: number;
  className?: string;
}

export default function CounterBadge({ count, className = '' }: CounterBadgeProps) {
  if (count < 1) return null;

  return (
    <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 text-[10px] leading-[16px] text-gray-800 bg-white border border-gray-300 rounded-full text-center ${className}`}>
      {count}
    </span>
  );
}