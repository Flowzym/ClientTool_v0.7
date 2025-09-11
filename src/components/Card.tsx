import React from 'react';
import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const baseClasses = [
    'bg-white rounded-lg border border-gray-200 shadow-sm relative'
  ];
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6', 
    lg: 'p-8'
  };
  
  return (
    <div className={cn(baseClasses, paddingClasses[padding], className)}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 pb-2 border-b border-gray-200', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4';
}

export function CardTitle({ children, className, as = 'h3' }: CardTitleProps) {
  const Tag = as;
  return (
    <Tag className={cn('text-lg font-semibold text-gray-900 text-balance', className)}>
      {children}
    </Tag>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('text-gray-700', className)}>
      {children}
    </div>
  );
}