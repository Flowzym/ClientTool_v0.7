import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../utils/cn';

interface AvatarProps {
  user?: {
    name: string;
    avatar?: string;
    initials?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ user, size = 'md', className }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = user?.initials || (user?.name ? getInitials(user.name) : '');

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={cn(
          'rounded-full object-cover border border-gray-200',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (initials) {
    return (
      <div
        className={cn(
          'rounded-full bg-accent-100 text-accent-700 border border-accent-200',
          'flex items-center justify-center font-medium',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full bg-gray-100 text-gray-500 border border-gray-200',
        'flex items-center justify-center',
        sizeClasses[size],
        className
      )}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  );
}