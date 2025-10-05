import React from 'react';

type User = { id: string; name?: string };

export default function AssignCell({ value, users, onChange }: { value?: string; users: User[]; onChange?: (v?: string) => void }) {
  return (
    <select
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value || undefined)}
    >
      <option value="">—</option>
      {users.filter(u => u.id).map(u => (
        <option key={u.id} value={u.id}>
          {u.name ?? u.id}
        </option>
      ))}
    </select>
  );
}
