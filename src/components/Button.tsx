import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-md',
    'transition-colors duration-200 ease-in-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ];
  
  const variantClasses = {
    primary: [
      'bg-accent-600 text-white hover:bg-accent-700',
      'focus:ring-accent-500'
    ],
    secondary: [
      'bg-gray-200 text-gray-900 hover:bg-gray-300',
      'focus:ring-gray-500'
    ],
    ghost: [
      'bg-transparent text-gray-700 hover:bg-gray-100',
      'focus:ring-gray-500'
    ]
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2 text-base min-h-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]'
  };
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}