import React from 'react';
import { FileText } from 'lucide-react';

interface EmptyProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function Empty({ 
  title, 
  description, 
  icon = <FileText className="w-12 h-12 text-gray-300" />,
  action 
}: EmptyProps) {
  return (
    <div className="text-center py-16 px-6">
      <div className="flex justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2 text-balance">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 mb-6 max-w-md mx-auto text-balance">
          {description}
        </p>
      )}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}