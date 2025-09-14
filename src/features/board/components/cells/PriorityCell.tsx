import React from 'react';

const PRIORITY_CONFIG = {
  niedrig: { color: 'bg-green-500', label: 'Niedrig' },
  normal: { color: 'bg-gray-400', label: 'Normal' },
  hoch: { color: 'bg-yellow-500', label: 'Hoch' },
  dringend: { color: 'bg-red-500', label: 'Dringend' }
};

export default function PriorityCell({ value, onCycle }: {
  value?: string | null;
  onCycle: () => void;
}) {
  const priority = value || 'normal';
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;

  return (
    <button 
      className="flex items-center justify-center p-2 rounded border hover:bg-gray-50" 
      onClick={onCycle} 
      title={`Priorität: ${config.label} (klicken zum Wechseln)`}
      aria-label={`Priorität ${config.label}, klicken zum Wechseln`}
    >
      <span className={`w-3 h-3 rounded-full ${config.color}`} />
    </button>
  );
}