import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface ColumnHeaderProps {
  columnKey: string;
  label: string;
  sortable?: boolean;
  isActive?: boolean;
  direction?: 'asc' | 'desc' | undefined;
  onToggle: () => void;
}

export default function ColumnHeader({
  columnKey,
  label,
  sortable = true,
  isActive = false,
  direction,
  onToggle
}: ColumnHeaderProps) {
  const getAriaSort = (): 'ascending' | 'descending' | 'none' => {
    if (!isActive || !direction) return 'none';
    return direction === 'asc' ? 'ascending' : 'descending';
  };

  const getSortIcon = () => {
    if (!isActive || !direction) return null;
    return direction === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  if (!sortable) {
    return (
      <div className="text-xs font-bold text-gray-600" role="columnheader">
        {label}
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors"
      onClick={onToggle}
      role="columnheader"
      aria-sort={getAriaSort()}
      title={`Nach ${label} sortieren`}
    >
      <span>{label}</span>
      {getSortIcon()}
    </button>
  );
}